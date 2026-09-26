import type { Invoice } from '../model/accounting';
import { invoicePaymentStatusKey, t } from '../i18n';

export type InvoiceMonthGroup = { month: string; invoices: Invoice[] };

export function receivedInvoiceGroups(invoices: Invoice[]): { income: Invoice[]; costs: Invoice[] } {
  return {
    income: invoices.filter((invoice) => invoice.direction === 'SALE'),
    costs: invoices.filter((invoice) => invoice.direction === 'PURCHASE')
  };
}

export function invoiceCounterpartyLabel(invoice: Invoice): string {
  return invoice.alias?.trim() || invoice.legalName?.trim() || invoice.counterparty?.trim() || invoice.title;
}

const incomeClassificationKeys: Record<string, string> = {
  PL_SERVICE: 'plService', EU_SERVICE: 'euService', PL_GOODS: 'plGoods', EU_GOODS: 'euGoods', EXPORT: 'export'
};
const costCategoryKeys: Record<string, string> = {
  FUEL: 'fuel', VEHICLE_FUEL: 'fuel', VEHICLE_SERVICE: 'vehicleService', CAR_WASH: 'vehicleService',
  ACCOUNTING_SERVICE: 'accounting', BUSINESS_SERVICE: 'businessService', SOFTWARE: 'software',
  EQUIPMENT: 'equipment', OFFICE_COST: 'office', OFFICE_SERVICE: 'office', VEHICLE_LEASING: 'vehicleLeasing', VEHICLE: 'vehicle'
};

export function invoiceClassificationLabel(direction: Invoice['direction'], classification: string | null | undefined): string | null {
  const normalized = classification?.trim().toUpperCase();
  if (!normalized) return null;
  const key = direction === 'SALE' ? incomeClassificationKeys[normalized] : direction === 'PURCHASE' ? costCategoryKeys[normalized] : incomeClassificationKeys[normalized] ?? costCategoryKeys[normalized];
  return key ? t(`invoices.classification.${key}`) : t('common.unknown');
}

export type InvoiceApprovalFilter = 'ALL' | 'NEEDS_REVIEW' | 'APPROVED';
export function invoiceApprovalMatches(invoice: Invoice, filter: InvoiceApprovalFilter): boolean {
  return filter === 'ALL' || invoice.approvalStatus?.trim().toUpperCase() === filter;
}

export type InvoiceSourceFilter = 'ALL' | 'KSEF' | 'UPLOAD';
export function invoiceSourceMatches(invoice: Invoice, filter: InvoiceSourceFilter): boolean {
  return filter === 'ALL' || invoice.sourceType?.trim().toUpperCase() === filter;
}

export function invoicePaymentPresentation(status: string | null | undefined): { labelKey: string; tone: 'success' | 'warning' | 'info' | 'muted' } | null {
  const key = invoicePaymentStatusKey(status);
  if (key === 'unknown') return null;
  if (key === 'matched' || key === 'manuallyConfirmed') return { labelKey: 'common.paid', tone: 'success' };
  if (key === 'unmatched') return { labelKey: 'common.unpaid', tone: 'warning' };
  if (key === 'partiallyMatched') return { labelKey: 'common.partial', tone: 'info' };
  return { labelKey: 'invoices.paymentNotRequiredShort', tone: 'muted' };
}

export function canMarkInvoiceManuallyPaid(paymentStatus: string | null | undefined): boolean {
  const status = paymentStatus?.trim().toUpperCase();
  return status !== 'MATCHED' && status !== 'MANUALLY_CONFIRMED' && status !== 'NOT_REQUIRED';
}

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
  const automatic = ['COUNTERPARTY_RULE', 'KSEF_TRUSTED'].includes(approvalMethod?.trim().toUpperCase() ?? '');
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
  source?: string | null;
  documentNumber: string | null;
  issueDate: string | null;
}): InvoiceSourcePresentation {
  if (source.sourceType?.trim().toUpperCase() === 'KSEF') {
    return {
      kind: 'ksef',
      reference: source.sourceReference?.trim() || source.source?.trim() || source.documentNumber,
      date: source.issueDate
    };
  }
  return { kind: 'document', reference: source.documentNumber, date: source.issueDate };
}
