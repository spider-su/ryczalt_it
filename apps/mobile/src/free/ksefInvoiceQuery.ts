import type { KsefEnvironment } from "./ksefAuth";
const HOSTS: Record<KsefEnvironment, string> = { production: "https://api.ksef.mf.gov.pl", demo: "https://api-demo.ksef.mf.gov.pl", test: "https://api-test.ksef.mf.gov.pl" };
export type KsefInvoiceMetadata = { ksefNumber: string };
type Page = { invoices?: unknown; hasMore?: unknown; isTruncated?: unknown };
/** Direct KSeF v2 metadata query; does not persist tokens or claim invoice download. */
export class KsefInvoiceQuery {
  constructor(private readonly environment: KsefEnvironment, private readonly transport: typeof fetch = fetch) {}
  async listMonth(accessToken: string, month: string, subjectType: "Subject1" | "Subject2"): Promise<KsefInvoiceMetadata[]> {
    if (!accessToken.trim()) throw new Error("Missing KSeF access token");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
    const [year, number] = month.split("-").map(Number);
    const from = new Date(Date.UTC(year, number - 1, 1)).toISOString();
    const to = new Date(Date.UTC(year, number, 1)).toISOString();
    const result = new Map<string, KsefInvoiceMetadata>();
    const pageSize = 250;
    for (let offset = 0; offset < 100; offset++) {
      const response = await this.transport(HOSTS[this.environment] + "/v2/invoices/query/metadata?pageOffset=" + offset + "&pageSize=" + pageSize, {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ subjectType, dateRange: { dateType: "Issue", from, to } }),
      });
      if (!response.ok) throw new Error(response.status === 403 ? "Brak uprawnienia InvoiceRead w KSeF." : "KSeF HTTP " + response.status);
      const page = await response.json() as Page;
      if (!Array.isArray(page.invoices)) throw new Error("Invalid KSeF metadata response");
      for (const item of page.invoices) {
        if (!item || typeof item !== "object" || typeof (item as KsefInvoiceMetadata).ksefNumber !== "string" ||
          !(item as KsefInvoiceMetadata).ksefNumber.trim()) throw new Error("Invalid KSeF invoice number");
        const record = item as KsefInvoiceMetadata;
        result.set(record.ksefNumber, { ksefNumber: record.ksefNumber });
      }
      if (page.hasMore === false || (page.invoices.length < pageSize && page.hasMore !== true && page.isTruncated !== true)) return [...result.values()];
    }
    throw new Error("KSeF page limit exceeded; results are incomplete");
  }
}
