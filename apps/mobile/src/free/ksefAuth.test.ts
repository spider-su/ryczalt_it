import { describe, expect, it, vi } from "vitest";
import { KsefAuthClient, KsefAuthError } from "./ksefAuth";

const nip = "5261040828";
const token = "fake-system-token";

function reply(body: unknown, status = 200): Response {
  return { ok: status === 200, status, json: async () => body } as Response;
}

describe("KSeF v2 authentication coordinator", () => {
  it("uses the official challenge/encrypted-token/status/redeem flow without sending the raw system token", async () => {
    const transport = vi.fn()
      .mockResolvedValueOnce(reply({ challenge: "challenge-1", timestamp: "2026-11-08T12:00:00.000Z" }))
      .mockResolvedValueOnce(reply({ referenceNumber: "ref-1", authenticationToken: { token: "temp-1" } }))
      .mockResolvedValueOnce(reply({ status: { code: 100 } }))
      .mockResolvedValueOnce(reply({ status: { code: 200 } }))
      .mockResolvedValueOnce(reply({ accessToken: { token: "jwt-1" }, refreshToken: { token: "refresh-1" } }));
    const encrypt = vi.fn().mockResolvedValue("ZmFrZWNpcGhlcg==");
    const delay = vi.fn().mockResolvedValue(undefined);
    const client = new KsefAuthClient("test", { encryptTokenWithKsefPublicKey: encrypt }, transport, delay);
    await expect(client.authenticate(nip, token)).resolves.toEqual({
      accessToken: "jwt-1", refreshToken: "refresh-1",
    });
    expect(encrypt).toHaveBeenCalledWith(`${token}|1794139200000`, "test");
    expect(transport.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      "https://api-test.ksef.mf.gov.pl/v2/auth/challenge",
      "https://api-test.ksef.mf.gov.pl/v2/auth/ksef-token",
      "https://api-test.ksef.mf.gov.pl/v2/auth/ref-1",
      "https://api-test.ksef.mf.gov.pl/v2/auth/ref-1",
      "https://api-test.ksef.mf.gov.pl/v2/auth/token/redeem",
    ]);
    const requests = transport.mock.calls.map((call: unknown[]) => JSON.stringify(call));
    expect(requests.join(" ")).not.toContain(token);
    expect(requests[1]).toContain('"type":"Nip"');
    expect(delay).toHaveBeenCalledOnce();
  });

  it("does not redeem tokens on failed authentication", async () => {
    const transport = vi.fn()
      .mockResolvedValueOnce(reply({ challenge: "c", timestamp: "2026-11-08T12:00:00Z" }))
      .mockResolvedValueOnce(reply({ referenceNumber: "ref", authenticationToken: { token: "temporary" } }))
      .mockResolvedValueOnce(reply({ status: { code: 400 } }));
    const client = new KsefAuthClient("test", { encryptTokenWithKsefPublicKey: async () => "YQ==" }, transport);
    await expect(client.authenticate(nip, token)).rejects.toBeInstanceOf(KsefAuthError);
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it("rejects malformed authentication responses", async () => {
    const transport = vi.fn().mockResolvedValue(reply({}));
    const client = new KsefAuthClient("test", { encryptTokenWithKsefPublicKey: async () => "YQ==" }, transport);
    await expect(client.authenticate(nip, token)).rejects.toThrow();
    expect(transport).toHaveBeenCalledOnce();
  });
});
