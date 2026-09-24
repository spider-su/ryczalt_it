import type { Invoice } from '../model/accounting';

export type InvoiceMonthGroup = { month: string; invoices: Invoice[] };

/** Groups display-filtered invoices by their already-mapped YYYY-MM-DD date. */
export function groupInvoicesByMonth(invoices: Invoice[]): InvoiceMonthGroup[] {
  const groups = new Map<string, Invoice[]>();
  for (const invoice of invoices) {
    const month = /^(\d{4}-(?:0[1-9]|1[0-2]))/.exec(invoice.issueDate ?? '')?.[1];
    if (!month) continue;
    const values = groups.get(month) ?? [];
    values.push(invoice);
    groups.set(month, values);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([month, values]) => ({ month, invoices: values }));
}

export type InvoiceApprovalPresentation = {
  label: 'approved' | 'needsReview' | 'unknown';
  tone: 'success' | 'warning' | 'muted';
  automatic: boolean;
} | null;

export function invoiceApprovalPresentation(
  approvalStatus: string | null | undefined,
  approvalMethod: string | null | undefined
): InvoiceApprovalPresentation {
  const status = approvalStatus?.trim().toUpperCase();
  const automatic = approvalMethod?.trim().toUpperCase() === 'COUNTERPARTY_RULE';
  if (!status) return null;
  if (status === 'APPROVED') return { label: 'approved', tone: 'success', automatic };
  if (status === 'NEEDS_REVIEW') return { label: 'needsReview', tone: 'warning', automatic: false };
  return { label: 'unknown', tone: 'muted', automatic: false };
}

export type InvoiceSourcePresentation = {
  kind: 'ksef' | 'document';
  reference: string | null;
  date: string | null;
};

export function invoiceSourcePresentation(source: {
  sourceType: string | null;
  sourceReference?: string | null;
  documentNumber: string | null;
  issueDate: string | null;
}): InvoiceSourcePresentation {
  if (source.sourceType?.trim().toUpperCase() === 'KSEF') {
    return {
      kind: 'ksef',
      reference: source.sourceReference?.trim() || source.documentNumber,
      date: source.issueDate
    };
  }
  return { kind: 'document', reference: source.documentNumber, date: source.issueDate };
}
