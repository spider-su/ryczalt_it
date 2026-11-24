#!/usr/bin/env bash
# One-time, local-only setup for the Android Google Play upload signing key.
# Requires Git Bash/macOS/Linux, GitHub CLI (gh), and Java keytool.
# IMPORTANT: Run this only on a trusted computer. Never commit the keystore.
set -euo pipefail
set +x
umask 077

REPOSITORY="spider-su/ryczalt_it"
KEYSTORE_PATH="${1:-}"
ALIAS="${2:-ryczalt-upload}"

if [[ -z "$KEYSTORE_PATH" || ! -f "$KEYSTORE_PATH" ]]; then
  echo "Usage: bash scripts/setup-play-upload-secrets.sh /secure/path/upload-key.jks [key-alias]" >&2
  echo "If Play already knows an upload certificate, provide the EXISTING key. Do not generate a replacement." >&2
  exit 2
fi

for command in gh keytool base64 tr; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing dependency: $command" >&2
    exit 2
  fi
done

if ! gh auth status >/dev/null 2>&1; then
  echo "Sign in with: gh auth login" >&2
  exit 2
fi

printf 'Keystore password: ' >&2
IFS= read -rs PLAY_UPLOAD_STORE_PASSWORD
printf '\n' >&2
printf 'Key password: ' >&2
IFS= read -rs PLAY_UPLOAD_KEY_PASSWORD
printf '\n' >&2

if [[ -z "$PLAY_UPLOAD_STORE_PASSWORD" || -z "$PLAY_UPLOAD_KEY_PASSWORD" || -z "$ALIAS" ]]; then
  echo "Keystore password, key password, and alias must be nonempty." >&2
  exit 2
fi
export PLAY_UPLOAD_STORE_PASSWORD PLAY_UPLOAD_KEY_PASSWORD
trap 'unset PLAY_UPLOAD_STORE_PASSWORD PLAY_UPLOAD_KEY_PASSWORD' EXIT

echo "Verifying keystore and alias locally (no key or password is uploaded yet)..."
if ! keytool -list -keystore "$KEYSTORE_PATH" -alias "$ALIAS" -storepass:env PLAY_UPLOAD_STORE_PASSWORD >/dev/null; then
  echo "Keystore could not be opened or alias was not found. No GitHub secrets were changed." >&2
  exit 1
fi

echo "Uploading four encrypted repository secrets via GitHub CLI..."
# Supply all values via stdin to avoid passwords on the command line or in shell history.
base64 < "$KEYSTORE_PATH" | tr -d '\r\n' | gh secret set PLAY_UPLOAD_KEYSTORE_BASE64 --repo "$REPOSITORY"
printf '%s' "$PLAY_UPLOAD_STORE_PASSWORD" | gh secret set PLAY_UPLOAD_STORE_PASSWORD --repo "$REPOSITORY"
printf '%s' "$ALIAS" | gh secret set PLAY_UPLOAD_KEY_ALIAS --repo "$REPOSITORY"
printf '%s' "$PLAY_UPLOAD_KEY_PASSWORD" | gh secret set PLAY_UPLOAD_KEY_PASSWORD --repo "$REPOSITORY"

echo "GitHub Actions repository secrets configured."
echo "KEEP AN OFFLINE BACKUP of the keystore, its alias, and both passwords."
echo "Run the Google Play Android AAB workflow manually on main after this setup."
