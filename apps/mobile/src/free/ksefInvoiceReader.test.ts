import { describe, it, expect, vi } from "vitest";
import { KsefInvoiceReader } from "./ksefInvoiceReader";
describe("KSeF metadata reader", () => {
  it("rejects truncated and malformed pages rather than declaring completion", async () => {
    for (const payload of [
      { invoices: [], hasMore: false, isTruncated: true },
      { invoices: [], hasMore: false },
      { invoices: [], hasMore: true, isTruncated: false },
    ]) {
      const reader = new KsefInvoiceReader(vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })) as typeof fetch);
      await expect(reader.list("token", "Subject1", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z")).rejects.toThrow();
    }
  });
  it("retries a transient HTTP 503 then imports metadata", async () => {
    const transport = vi.fn().mockResolvedValueOnce(new Response("", {status:503}))
      .mockResolvedValueOnce(new Response(JSON.stringify({ invoices:[], hasMore:false, isTruncated:false }), {status:200}));
    const reader = new KsefInvoiceReader(transport as typeof fetch);
    expect(await reader.list("token", "Subject1", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z")).toEqual({invoices:[],hasMore:false});
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("does not retry authorization errors", async () => {
    const transport = vi.fn(async () => new Response("", {status:403}));
    const reader = new KsefInvoiceReader(transport as typeof fetch);
    await expect(reader.downloadXml("token", "1234567890-20260101-AAA")).rejects.toThrow("HTTP 403");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("accepts a complete empty page", async () => {
    const reader = new KsefInvoiceReader(vi.fn(async () => new Response(JSON.stringify({invoices: [], hasMore: false, isTruncated: false}), {status: 200})) as typeof fetch);
    expect(await reader.list("token", "Subject2", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z")).toEqual({invoices: [], hasMore: false});
  });
});
