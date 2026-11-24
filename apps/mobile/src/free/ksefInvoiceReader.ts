/**
 * Read-only KSeF v2 transport. No document body or JWT is persisted here.
 * A caller must supply a freshly authenticated access token.
 */
export interface KsefInvoiceReference {
  ksefNumber: string;
  invoiceNumber: string;
  invoicingDate: string;
}
export type KsefQuerySubject = "Subject1" | "Subject2";
const API = "https://api.ksef.mf.gov.pl";
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid KSeF response");
  return value as Record<string, unknown>;
}
function nonEmpty(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Missing KSeF invoice identifier");
  return value;
}
export class KsefInvoiceReader {
  constructor(private readonly transport: typeof fetch = fetch) {}
  private async request(path: string, token: string, body?: unknown): Promise<Response> {
    if (!token) throw new Error("KSeF authentication required");
    const response = await this.transport(API + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: body === undefined ? "application/xml, application/json" : "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`KSeF request failed (HTTP ${response.status})`);
    return response;
  }
  async list(
    token: string, subjectType: KsefQuerySubject, from: string, to: string,
    pageOffset = 0, pageSize = 100,
  ): Promise<{ invoices: KsefInvoiceReference[]; hasMore: boolean }> {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(from) || !/^\d{4}-\d{2}-\d{2}T/.test(to))
      throw new Error("Invalid KSeF date interval");
    if (!Number.isInteger(pageOffset) || pageOffset < 0 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 250)
      throw new Error("Invalid KSeF pagination");
    const response = await this.request(
      `/v2/invoices/query/metadata?pageOffset=${pageOffset}&pageSize=${pageSize}`,
      token,
      { subjectType, dateRange: { dateType: "Issue", from, to } },
    );
    const payload = record(await response.json());
    if (!Array.isArray(payload.invoices) || typeof payload.hasMore !== "boolean")
      throw new Error("Unexpected KSeF metadata response");
    const invoices = payload.invoices.map((item) => {
      const value = record(item);
      return {
        ksefNumber: nonEmpty(value.ksefNumber),
        invoiceNumber: nonEmpty(value.invoiceNumber),
        invoicingDate: nonEmpty(value.invoicingDate),
      };
    });
    return { invoices, hasMore: payload.hasMore };
  }
  async downloadXml(token: string, ksefNumber: string): Promise<string> {
    if (!/^[A-Za-z0-9-]{10,120}$/.test(ksefNumber)) throw new Error("Invalid KSeF number");
    const response = await this.request(`/v2/invoices/ksef/${encodeURIComponent(ksefNumber)}`, token);
    const xml = await response.text();
    if (xml.length > 2_000_000 || !xml.includes("<")) throw new Error("Invalid KSeF XML");
    return xml; // transient only; caller must extract minimum fields, never persist XML
  }
}
