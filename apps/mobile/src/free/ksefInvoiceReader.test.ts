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
  it("accepts a complete empty page", async () => {
    const reader = new KsefInvoiceReader(vi.fn(async () => new Response(JSON.stringify({invoices: [], hasMore: false, isTruncated: false}), {status: 200})) as typeof fetch);
    expect(await reader.list("token", "Subject2", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z")).toEqual({invoices: [], hasMore: false});
  });
});
