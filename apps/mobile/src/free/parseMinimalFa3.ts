import { DOMParser } from "@xmldom/xmldom";
import type { KsefInvoice, InvoiceDirection, InvoiceKind } from "./invoiceLedger";

function money(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Unsupported invoice amount");
  const result = BigInt(match[2] ?? "0") * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
  return match[1] ? -result : result;
}
/** Namespace-aware extraction. Refuse documents we cannot interpret instead of guessing. */
export function parseMinimalFa3(xml: string, ksefId: string, taxpayerNip: string, direction: InvoiceDirection): KsefInvoice {
  if (!xml.trim() || xml.length > 2_000_000 || /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error("Unsafe invoice XML");
  let doc: ReturnType<DOMParser["parseFromString"]>;
  try { doc = new DOMParser({ onError: () => { throw new Error("Invalid XML"); } }).parseFromString(xml, "application/xml"); }
  catch { throw new Error("Invalid invoice XML"); }
  if (doc.doctype || doc.documentElement?.localName !== "Faktura" || !doc.documentElement.namespaceURI?.startsWith("http://crd.gov.pl/wzor/")) throw new Error("Unsupported invoice schema");
  const elements = (name: string) => Array.from(doc.getElementsByTagNameNS("*", name));
  const first = (name: string) => elements(name)[0]?.textContent?.trim() || undefined;
  const party = direction === "issued" ? "Podmiot1" : "Podmiot2";
  const nip = elements(party)[0]?.getElementsByTagNameNS("*", "NIP")[0]?.textContent?.trim();
  if (nip !== taxpayerNip) throw new Error("Invoice taxpayer mismatch");
  const issueDate = first("P_1"); const currency = first("KodWaluty"); const invoiceType = first("RodzajFaktury");
  if (!issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || !currency || !/^[A-Z]{3}$/.test(currency)) throw new Error("Missing invoice date or currency");
  const kinds: Record<string, InvoiceKind> = { VAT: "standard", KOR: "correction", ZAL: "advance", ROZ: "final", KOR_ZAL: "correction", KOR_ROZ: "correction" };
  const kind = invoiceType ? kinds[invoiceType] : undefined;
  if (!kind) throw new Error("Unsupported invoice type");
  const all = Array.from(doc.getElementsByTagNameNS("*", "*"));
  const sum = (prefix: string): bigint | null => {
    const fields = all.filter((element) => element.localName?.startsWith(prefix));
    return fields.length ? fields.reduce((total, field) => total + money(field.textContent ?? ""), 0n) : null;
  };
  let net = sum("P_13_"); let vat = sum("P_14_"); const grossText = first("P_15"); let gross = grossText ? money(grossText) : null;
  if (net === null && gross !== null && vat !== null) net = gross - vat;
  if (vat === null && gross !== null && net !== null) vat = gross - net;
  if (gross === null && net !== null && vat !== null) gross = net + vat;
  if (gross === null || net === null || vat === null) throw new Error("Invoice totals are incomplete");
  return { ksefId, taxpayerNip, direction, kind, issueDate, currency, grossMinor: gross.toString(), netMinor: net.toString(), vatMinor: vat.toString(), classification: "unclassified", source: "ksef" };
}
