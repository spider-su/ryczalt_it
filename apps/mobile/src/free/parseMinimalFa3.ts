import type { KsefInvoice, InvoiceDirection } from "./invoiceLedger";

/** Minimal FA(3) extractor. Reject missing amounts rather than storing fabricated zeroes. */
function field(xml: string, name: string): string | undefined {
  const match = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}(?:\\s[^>]*)?>([^<]*)<\\/(?:[A-Za-z_][\\w.-]*:)?${name}>`).exec(xml);
  return match?.[1]?.trim();
}
function money(value: string | undefined): string {
  if (!value || !/^-?\d+(?:\.\d{1,2})?$/.test(value)) throw new Error("Missing or invalid invoice amount");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const cents = (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
  return negative ? "-" + cents : cents;
}
export function parseMinimalFa3(
  xml: string, ksefId: string, taxpayerNip: string, direction: InvoiceDirection,
): KsefInvoice {
  if (!/<(?:\w+:)?Faktura[\s>]/.test(xml) || !xml.includes("http://crd.gov.pl/wzor/"))
    throw new Error("Not a recognized Polish e-invoice");
  const issueDate = field(xml, "P_1");
  const currency = field(xml, "KodWaluty");
  if (!issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || !currency) throw new Error("Missing invoice date/currency");
  const gross = money(field(xml, "P_15"));
  // FA(3) net and VAT totals depend on rate-specific fields. Require them explicitly.
  const netFields = ["P_13_1", "P_13_2", "P_13_3", "P_13_4", "P_13_5", "P_13_6", "P_13_7"];
  const vatFields = ["P_14_1", "P_14_2", "P_14_3", "P_14_4", "P_14_5"];
  const sum = (fields: string[]): string => fields.reduce((total, name) => {
    const value = field(xml, name);
    return total + (value === undefined ? 0n : BigInt(money(value)));
  }, 0n).toString();
  if (!netFields.some((name) => field(xml, name) !== undefined))
    throw new Error("Unsupported invoice: net totals missing");
  const kindCode = field(xml, "RodzajFaktury");
  const kind = kindCode === "KOR" ? "correction" : kindCode === "ZAL" ? "advance" : kindCode === "ROZ" ? "final" : "standard";
  return {
    ksefId, taxpayerNip, direction, kind, issueDate, currency,
    grossMinor: gross, netMinor: sum(netFields), vatMinor: sum(vatFields),
    classification: "unclassified", source: "ksef",
  };
}
