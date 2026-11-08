import { describe, expect, it, vi } from "vitest";
import { lookupCompanyByNip, validNip } from "./nip";

describe("NIP validation", () => {
  it("accepts a correct checksum with or without separators", () => {
    expect(validNip("5261040828")).toBe(true);
    expect(validNip("526-104-08-28")).toBe(true);
  });
  it("rejects malformed or incorrect numbers", () => {
    expect(validNip("5261040829")).toBe(false);
    expect(validNip("123")).toBe(false);
    expect(validNip("abcdefghij")).toBe(false);
  });
});

describe("MF VAT registry lookup", () => {
  it("uses the official 2026 endpoint and maps confirmed company fields", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { subject: {
        nip: "5261040828", name: "Testowa Firma", regon: "012345678",
        statusVat: "Czynny", workingAddress: "Kraków",
      }, requestId: "sample-request" } }),
    });
    const result = await lookupCompanyByNip("5261040828", new Date(2026, 10, 8), request as unknown as typeof fetch);
    expect(request.mock.calls[0]?.[0]).toBe("https://wykazpodatnikowvat.mf.gov.pl/api/search/nip/5261040828?date=2026-11-08");
    expect(result.name).toBe("Testowa Firma");
    expect(result.statusVat).toBe("Czynny");
    expect(result.requestId).toBe("sample-request");
  });
  it("rejects a registry identity mismatch", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { subject: { nip: "0000000000", name: "Other" } } }),
    });
    await expect(lookupCompanyByNip("5261040828", new Date(2026, 10, 8), request as unknown as typeof fetch))
      .rejects.toThrow("Nie znaleziono");
  });
  it("does not call the network for invalid NIP", async () => {
    const request = vi.fn();
    await expect(lookupCompanyByNip("000", new Date(), request as unknown as typeof fetch))
      .rejects.toThrow("Nieprawidłowy NIP");
    expect(request).not.toHaveBeenCalled();
  });
});
