import { describe, expect, it, vi } from "vitest";
import {
  decodeBase64, encodeBase64, extractSpkiFromX509Der,
  fetchTokenEncryptionCertificate, KsefWebCryptoEncryptor,
  selectTokenEncryptionCertificate,
} from "./ksefEncryption";

function der(tag: number, bytes: number[]): number[] {
  if (bytes.length >= 128) throw new Error("Test fixtures only support short-form length.");
  return [tag, bytes.length, ...bytes];
}
const algorithm = der(0x30, der(0x06, [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]).concat(der(0x05, [])));
const spkiBytes = der(0x30, algorithm.concat(der(0x03, [0x00, 0xaa])));
const tbsBytes = der(0x30, [
  ...der(0x02, [1]), // serial
  ...algorithm,       // signature
  ...der(0x30, []), // issuer
  ...der(0x30, []), // validity
  ...der(0x30, []), // subject
  ...spkiBytes,       // subjectPublicKeyInfo
]);
const certBytes = der(0x30, tbsBytes.concat(algorithm, der(0x03, [0x00, 0xbb])));
const certificate = {
  certificate: encodeBase64(new Uint8Array(certBytes)),
  certificateId: "cert-1",
  publicKeyId: "key-1",
  validFrom: "2026-01-01T00:00:00Z",
  validTo: "2027-01-01T00:00:00Z",
  usage: ["KsefTokenEncryption"],
};

describe("KSeF public encryption key selection", () => {
  it("selects active token-encryption certificate, never expired or wrong-use keys", () => {
    const selected = selectTokenEncryptionCertificate([
      { ...certificate, publicKeyId: "expired", validTo: "2026-02-01T00:00:00Z" },
      { ...certificate, publicKeyId: "wrong", usage: ["SymmetricKeyEncryption"] },
      certificate,
    ], new Date("2026-11-08T00:00:00Z"));
    expect(selected.publicKeyId).toBe("key-1");
  });

  it("fails closed when no active token encryption key exists", () => {
    expect(() => selectTokenEncryptionCertificate([
      { ...certificate, usage: ["SymmetricKeyEncryption"] },
    ], new Date("2026-11-08T00:00:00Z"))).toThrow("Brak ważnego");
  });

  it("decodes an X509 certificate and extracts the exact SPKI element", () => {
    const bytes = new Uint8Array(certBytes);
    expect(extractSpkiFromX509Der(bytes)).toEqual(new Uint8Array(spkiBytes));
    expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
  });

  it("fetches and imports the current key with RSA-OAEP SHA256", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true, json: async () => [certificate],
    });
    const encrypted = new Uint8Array([0, 1, 2, 3]);
    const subtle = {
      importKey: vi.fn().mockResolvedValue({ type: "public" }),
      encrypt: vi.fn().mockResolvedValue(encrypted.buffer),
    };
    expect((await fetchTokenEncryptionCertificate("test", fetcher)).publicKeyId).toBe("key-1");
    const result = await new KsefWebCryptoEncryptor(fetcher, subtle).encryptTokenWithKsefPublicKey(
      "dummy-token|1794139200000", "test",
    );
    expect(result).toEqual({ publicKeyId: "key-1", encryptedToken: "AAECAw==" });
    expect(subtle.importKey.mock.calls[0]?.[2]).toEqual({ name: "RSA-OAEP", hash: "SHA-256" });
    expect(subtle.encrypt.mock.calls[0]?.[0]).toEqual({ name: "RSA-OAEP" });
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api-test.ksef.mf.gov.pl/v2/security/public-key-certificates");
  });
});
