import { describe, expect, it, vi } from "vitest";
import { KsefInvoiceQuery } from "./ksefInvoiceQuery";
describe("KSeF live metadata transport", () => {
  it("queries issued and received using Bearer token and date range", async () => {
    const transport = vi.fn(async () => new Response(JSON.stringify({ invoices: [{ ksefNumber: "K-1" }] }), { status: 200 }));
    const query = new KsefInvoiceQuery("production", transport as typeof fetch);
    expect(await query.listMonth("access-token", "2026-11", "Subject1")).toEqual([{ ksefNumber: "K-1" }]);
    const [url, init] = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v2/invoices/query/metadata?pageOffset=0&pageSize=250");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer access-token");
    expect(JSON.parse(init.body as string)).toMatchObject({ subjectType: "Subject1", dateRange: { dateType: "Issue", from: "2026-11-01T00:00:00.000Z", to: "2026-12-01T00:00:00.000Z" } });
  });
  it("rejects missing permissions and malformed responses", async () => {
    const denied = new KsefInvoiceQuery("production", vi.fn(async () => new Response("", { status: 403 })) as typeof fetch);
    await expect(denied.listMonth("token", "2026-11", "Subject2")).rejects.toThrow("InvoiceRead");
    const invalid = new KsefInvoiceQuery("production", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })) as typeof fetch);
    await expect(invalid.listMonth("token", "2026-11", "Subject1")).rejects.toThrow("Invalid");
  });
  it("deduplicates pages and does not silently accept incomplete results", async () => {
    let page = 0;
    const transport = vi.fn(async () => {
      page += 1;
      return new Response(JSON.stringify({ invoices: [{ ksefNumber: "K-1" }], hasMore: page === 1 }), { status: 200 });
    });
    const query = new KsefInvoiceQuery("production", transport as typeof fetch);
    expect(await query.listMonth("token", "2026-11", "Subject2")).toEqual([{ ksefNumber: "K-1" }]);
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
