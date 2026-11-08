import type { KsefEnvironment, KsefRsaEncryptor } from "./ksefAuth";

/**
 * KSeF API public encryption certificates are X.509 DER/Base64; they rotate.
 * Never pin a certificate in the application bundle.
 */
const HOSTS: Record<KsefEnvironment, string> = {
  production: "https://api.ksef.mf.gov.pl",
  demo: "https://api-demo.ksef.mf.gov.pl",
  test: "https://api-test.ksef.mf.gov.pl",
};
export type PublicEncryptionCertificate = {
  certificate: string;
  certificateId: string;
  publicKeyId: string;
  validFrom: string;
  validTo: string;
  usage: string[];
};
export type SelectedCertificate = { derBase64: string; publicKeyId: string };

export function selectTokenEncryptionCertificate(
  response: unknown, at: Date = new Date(),
): SelectedCertificate {
  if (!Array.isArray(response)) throw new Error("Nieprawidłowa lista certyfikatów KSeF.");
  const candidates: PublicEncryptionCertificate[] = response.filter((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const cert = item as Partial<PublicEncryptionCertificate>;
    return typeof cert.certificate === "string" && cert.certificate.length > 40 &&
      typeof cert.certificateId === "string" && typeof cert.publicKeyId === "string" &&
      typeof cert.validFrom === "string" && typeof cert.validTo === "string" &&
      Array.isArray(cert.usage) && cert.usage.includes("KsefTokenEncryption") &&
      Number.isFinite(Date.parse(cert.validFrom)) && Number.isFinite(Date.parse(cert.validTo)) &&
      Date.parse(cert.validFrom) <= at.getTime() && Date.parse(cert.validTo) > at.getTime();
  });
  candidates.sort((a, b) => Date.parse(b.validFrom) - Date.parse(a.validFrom));
  const selected = candidates[0];
  if (!selected) throw new Error("Brak ważnego klucza publicznego KSeF do szyfrowania tokenu.");
  return { derBase64: selected.certificate, publicKeyId: selected.publicKeyId };
}

export async function fetchTokenEncryptionCertificate(
  environment: KsefEnvironment,
  transport: typeof fetch = fetch,
): Promise<SelectedCertificate> {
  const response = await transport(`${HOSTS[environment]}/v2/security/public-key-certificates`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Nie udało się pobrać kluczy publicznych KSeF.");
  return selectTokenEncryptionCertificate(await response.json() as unknown);
}

/** Tight DER reader for extracting subjectPublicKeyInfo from an X.509 certificate. */
function readElement(data: Uint8Array, offset: number): { tag: number; start: number; end: number; next: number } {
  if (offset < 0 || offset + 2 > data.length) throw new Error("Niepoprawny certyfikat X.509.");
  const tag = data[offset]!;
  const lengthOctet = data[offset + 1]!;
  let size = lengthOctet;
  let cursor = offset + 2;
  if (lengthOctet & 0x80) {
    const count = lengthOctet & 0x7f;
    if (count === 0 || count > 4 || cursor + count > data.length) throw new Error("Niepoprawna długość DER.");
    size = 0;
    for (let i = 0; i < count; i++) size = size * 256 + data[cursor++]!;
  }
  const end = cursor + size;
  if (end > data.length) throw new Error("Niepoprawny certyfikat X.509.");
  return { tag, start: cursor, end, next: end };
}
function children(data: Uint8Array, node: ReturnType<typeof readElement>) {
  const result: ReturnType<typeof readElement>[] = [];
  for (let cursor = node.start; cursor < node.end;) {
    const child = readElement(data, cursor);
    result.push(child);
    cursor = child.next;
  }
  return result;
}

export function extractSpkiFromX509Der(der: Uint8Array): Uint8Array {
  const cert = readElement(der, 0);
  if (cert.tag !== 0x30 || cert.next !== der.length) throw new Error("Niepoprawny certyfikat X.509.");
  const tbs = children(der, cert)[0];
  if (!tbs || tbs.tag !== 0x30) throw new Error("Niepoprawny certyfikat X.509.");
  const fields = children(der, tbs);
  const versionOffset = fields[0]?.tag === 0xa0 ? 1 : 0;
  const spki = fields[versionOffset + 5];
  if (!spki || spki.tag !== 0x30) throw new Error("Brak klucza publicznego w certyfikacie.");
  // Verify SubjectPublicKeyInfo has an algorithm and BIT STRING.
  const parts = children(der, spki);
  if (parts.length !== 2 || parts[0]?.tag !== 0x30 || parts[1]?.tag !== 0x03)
    throw new Error("Niepoprawny klucz publiczny X.509.");
  const start = spki.start - (spki.next - spki.end); // overwritten below by direct tag search
  void start;
  // SPKI begins at the original DER element's tag position. Find it by
  // traversing from TBS start so we retain tag+length bytes intact.
  let cursor = tbs.start;
  for (let i = 0; i < versionOffset + 5; i++) cursor = readElement(der, cursor).next;
  return der.slice(cursor, spki.next);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/\s/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean))
    throw new Error("Niepoprawne kodowanie certyfikatu.");
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]!);
    const b = B64.indexOf(clean[i + 1]!);
    const c = clean[i + 2] === "=" ? 0 : B64.indexOf(clean[i + 2]!);
    const d = clean[i + 3] === "=" ? 0 : B64.indexOf(clean[i + 3]!);
    bytes.push((a << 2) | (b >> 4));
    if (clean[i + 2] !== "=") bytes.push(((b & 15) << 4) | (c >> 2));
    if (clean[i + 3] !== "=") bytes.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(bytes);
}
export function encodeBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    result += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : "=") +
      (i + 2 < bytes.length ? B64[c & 63] : "=");
  }
  return result;
}

type MinimalSubtle = Pick<SubtleCrypto, "importKey" | "encrypt">;

/** Uses an available native WebCrypto implementation; fails closed if unsupported. */
export class KsefWebCryptoEncryptor implements KsefRsaEncryptor {
  constructor(
    private readonly certificates: typeof fetch = fetch,
    private readonly subtle: MinimalSubtle | undefined = globalThis.crypto?.subtle,
  ) {}
  async encryptTokenWithKsefPublicKey(plaintext: string, environment: KsefEnvironment) {
    if (!this.subtle) throw new Error("RSA-OAEP nie jest dostępny na tym urządzeniu.");
    const selected = await fetchTokenEncryptionCertificate(environment, this.certificates);
    const spki = extractSpkiFromX509Der(decodeBase64(selected.derBase64));
    const key = await this.subtle.importKey("spki", spki.buffer as ArrayBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
    const payload = new TextEncoder().encode(plaintext);
    const encrypted = await this.subtle.encrypt({ name: "RSA-OAEP" }, key, payload);
    return { encryptedToken: encodeBase64(new Uint8Array(encrypted)), publicKeyId: selected.publicKeyId };
  }
}
