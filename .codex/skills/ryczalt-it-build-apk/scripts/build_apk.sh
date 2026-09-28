#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="${1:-$PWD}"
repo_root="$(cd "$repo_root" && pwd)"
mobile_root="$repo_root/apps/mobile"
app_config="$mobile_root/app.json"
package_json="$mobile_root/package.json"
artifact="$mobile_root/scripts/tmp/investory-accounting.apk"
expected_package="pl.investory.accounting"
expected_owner="smart-box"
expected_project_id="8fa28fb6-df62-4889-8e3a-8094de92bd59"

if [[ ! -f "$app_config" || ! -f "$package_json" || ! -f "$mobile_root/package-lock.json" ]]; then
  echo "Expected apps/mobile/app.json, package.json, and package-lock.json under '$repo_root'." >&2
  exit 2
fi

node - "$app_config" "$package_json" "$expected_package" "$expected_owner" "$expected_project_id" <<'NODE'
const fs = require('node:fs');
const [appPath, packagePath, expectedPackage, expectedOwner, expectedProjectId] = process.argv.slice(2);
const app = JSON.parse(fs.readFileSync(appPath, 'utf8')).expo;
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const problems = [];
if (app?.android?.package !== expectedPackage) problems.push(`Android package must be ${expectedPackage}`);
if (app?.ios?.bundleIdentifier !== expectedPackage) problems.push(`iOS bundle ID must be ${expectedPackage}`);
if (app?.owner !== expectedOwner) problems.push(`Expo owner must be ${expectedOwner}`);
if (app?.extra?.eas?.projectId !== expectedProjectId) problems.push('Expo project ID does not match this checkout');
if (problems.length) {
  console.error(problems.map((item) => `- ${item}`).join('\n'));
  process.exit(2);
}
NODE

node - "$package_json" "$mobile_root/package-lock.json" <<'NODE'
const fs = require('node:fs');
const [packagePath, lockPath] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const declared = manifest.dependencies?.['expo-clipboard'];
const lockedDeclaration = lock.packages?.['']?.dependencies?.['expo-clipboard'];
const lockedVersion = lock.packages?.['node_modules/expo-clipboard']?.version;
if (!declared || declared !== lockedDeclaration || declared !== lockedVersion) {
  console.error('expo-clipboard must be a direct dependency whose declared and locked versions match.');
  console.error('Run `npx expo install expo-clipboard` explicitly to select the Expo SDK-compatible version, commit both manifests, then rerun this build.');
  process.exit(2);
}
NODE

data_source="${EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE:-api}"
if [[ "$data_source" != "api" ]]; then
  echo "Refusing to build a QA APK with EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE='$data_source'; API mode is required." >&2
  exit 2
fi
if [[ -z "${EXPO_PUBLIC_API_URL:-}" ]]; then
  echo "Set EXPO_PUBLIC_API_URL to the intended HTTPS backend API origin before building." >&2
  exit 2
fi
node - "$EXPO_PUBLIC_API_URL" <<'NODE'
try {
  const url = new URL(process.argv[2]);
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error();
} catch {
  console.error('EXPO_PUBLIC_API_URL must be an absolute HTTPS URL without embedded credentials.');
  process.exit(2);
}
NODE

java_home="${JAVA_HOME:-}"
java_major="$(if [[ -n "$java_home" && -x "$java_home/bin/java" ]]; then "$java_home/bin/java" -version 2>&1; fi | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -1)"
if [[ "$java_major" != "17" ]]; then java_home=""; fi
if [[ -z "$java_home" && -x /usr/libexec/java_home ]]; then
  candidate="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  candidate_major="$(if [[ -n "$candidate" && -x "$candidate/bin/java" ]]; then "$candidate/bin/java" -version 2>&1; fi | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -1)"
  if [[ "$candidate_major" == "17" ]]; then java_home="$candidate"; fi
fi
if [[ -z "$java_home" ]]; then
  for candidate in "$HOME"/.sdkman/candidates/java/17*; do
    [[ -x "$candidate/bin/java" ]] || continue
    candidate_major="$("$candidate/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9][0-9]*\).*/\1/p' | head -1)"
    if [[ "$candidate_major" == "17" ]]; then java_home="$candidate"; break; fi
  done
fi
if [[ -z "$java_home" || ! -x "$java_home/bin/java" ]]; then
  echo "JDK 17 is required. Set JAVA_HOME to a local JDK 17 installation." >&2
  exit 2
fi
export JAVA_HOME="$java_home"
export PATH="$JAVA_HOME/bin:$PATH"

sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$sdk_root" ]]; then
  for candidate in "$HOME/Library/Android/sdk" /opt/homebrew/share/android-commandlinetools; do
    if [[ -d "$candidate" ]]; then sdk_root="$candidate"; break; fi
  done
fi
if [[ -z "$sdk_root" || ! -d "$sdk_root" ]]; then
  echo "Android SDK not found. Set ANDROID_SDK_ROOT or ANDROID_HOME." >&2
  exit 2
fi
export ANDROID_HOME="$sdk_root"
export ANDROID_SDK_ROOT="$sdk_root"
export SENTRY_DISABLE_AUTO_UPLOAD=true

echo "Using Java 17 and Android SDK at the configured local path."
echo "Backend API URL: configured (redacted)."
cd "$mobile_root"
if [[ ! -x node_modules/.bin/expo ]]; then
  echo "Installing locked mobile dependencies with npm ci."
  npm ci
fi
npx expo prebuild --no-install --platform android
(cd android && ./gradlew --no-daemon clean assembleRelease)

candidate="$mobile_root/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -s "$candidate" ]]; then
  echo "Release APK was not produced at the expected path." >&2
  exit 1
fi
unzip -t "$candidate" >/dev/null
if ! unzip -Z1 "$candidate" | grep -Fxq 'assets/index.android.bundle'; then
  echo "APK does not contain the embedded Android JS bundle; refusing a non-standalone artifact." >&2
  exit 1
fi

build_tools="$(node - "$ANDROID_SDK_ROOT/build-tools" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
if (!fs.existsSync(root)) process.exit(0);
const versions = fs.readdirSync(root).filter((value) => /^\d+(\.\d+)*$/.test(value)).sort((a, b) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const difference = (x[i] || 0) - (y[i] || 0);
    if (difference) return difference;
  }
  return 0;
});
if (versions.length) process.stdout.write(path.join(root, versions.at(-1)));
NODE
)"
apksigner="$build_tools/apksigner"
aapt="$build_tools/aapt"
if [[ ! -x "$apksigner" || ! -x "$aapt" ]]; then
  echo "Android build-tools must provide apksigner and aapt." >&2
  exit 2
fi
"$apksigner" verify --verbose "$candidate" >/dev/null
manifest_package="$("$aapt" dump badging "$candidate" | sed -n "s/^package: name='\\([^']*\\)'.*/\\1/p")"
if [[ "$manifest_package" != "$expected_package" ]]; then
  echo "Built APK package '$manifest_package' does not match '$expected_package'." >&2
  exit 1
fi

mkdir -p "$(dirname "$artifact")"
temporary_artifact="$(mktemp "${artifact}.tmp.XXXXXX")"
cp "$candidate" "$temporary_artifact"
chmod 644 "$temporary_artifact"
mv -f "$temporary_artifact" "$artifact"

echo "APK: $artifact"
ls -lh "$artifact"
shasum -a 256 "$artifact"
echo "Package: $manifest_package"
echo "Signature: verified by apksigner (local QA signing only)"
