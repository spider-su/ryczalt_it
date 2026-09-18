import { AccountingDocumentDto, AccountingIssueDto, AccountingMonthOverviewDto, Decimal, PaymentHistoryDto } from '../dto/accounting';
import { AccountingIssue, AccountingLine, AccountingMonth, Money, PaymentHistoryLine } from '../../model/accounting';

export const POLISH_OBLIGATION_CURRENCY = 'PLN';

function decimalString(amount: Decimal): string {
  const value = typeof amount === 'number' ? String(amount) : amount.trim();
  if (!value || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error('Accounting response contains an invalid decimal amount');
  }
  return value;
}

function requiredMoney(amount: Decimal | null | undefined, currency?: string | null): Money {
  if (amount == null) return { amount: null, ...(currency ? { currency } : {}) };
  return { amount: decimalString(amount), ...(currency ? { currency } : {}) };
}

function mapIssue(issue: AccountingIssueDto): AccountingIssue {
  return { ...issue, resolution: { ...issue.resolution, options: [...issue.resolution.options] } };
}

function formatDate(date: string | null): string | undefined { return date ? date.slice(0, 10) : undefined; }

export function mapDirection(type: string | null | undefined): AccountingLine['direction'] {
  const normalized = type?.toUpperCase() ?? '';
  if (['SALE', 'SALES', 'INCOME'].includes(normalized)) return 'SALE';
  if (['PURCHASE', 'PURCHASES', 'COST', 'COSTS'].includes(normalized)) return 'PURCHASE';
  return 'UNKNOWN';
}

export function mapDocument(document: AccountingDocumentDto): AccountingLine {
  const subtitle = [
    document.documentNumber,
    formatDate(document.issueDate ?? document.saleDate),
    document.sourceTypeLabel,
    document.categoryLabel
  ]
    .filter(Boolean)
    .join(' · ');

  const status = document.status?.toUpperCase();
  const reviewStatus = document.reviewStatus?.toUpperCase();
  const state = status === 'FAILED' || reviewStatus === 'REVIEW_REQUIRED'
    ? 'attention'
    : status && ['IMPORTED', 'PARSED', 'PROMOTED', 'STAGED', 'CREATED'].includes(status)
      ? 'ok'
      : 'unknown';
  return {
    id: String(document.id),
    title: document.counterparty ?? document.documentNumber ?? '',
    ...(subtitle ? { subtitle } : {}),
    amount: requiredMoney(document.amount, document.currency),
    state,
    sourceLabel: document.sourceTypeLabel,
    categoryLabel: document.categoryLabel,
    reviewStatus: document.reviewStatus,
    source: document.source,
    direction: mapDirection(document.type),
    counterparty: document.counterparty,
    documentNumber: document.documentNumber,
    issueDate: formatDate(document.issueDate ?? document.saleDate) ?? null,
    currency: document.currency,
    paymentStatus: document.paymentStatus,
    ksefStatus: document.importStatus
  };
}

export function mapDocuments(documents: AccountingDocumentDto[]): AccountingLine[] {
  return documents.map(mapDocument);
}

export function mapPaymentHistory(payments: PaymentHistoryDto[]): PaymentHistoryLine[] {
  return payments.map((payment, index) => ({
    id: `${payment.type}-${payment.period}-${index}`,
    title: payment.type,
    dueDate: payment.dueDate,
    amount: requiredMoney(payment.amount, POLISH_OBLIGATION_CURRENCY),
    paidAmount: requiredMoney(payment.paidAmount, POLISH_OBLIGATION_CURRENCY),
    outstandingAmount: requiredMoney(payment.outstandingAmount, POLISH_OBLIGATION_CURRENCY),
    status: payment.status ?? 'UNKNOWN',
    period: payment.period,
    paymentDate: payment.paymentDate
  }));
}

export function mapAccountingMonth(
  overview: AccountingMonthOverviewDto,
  documents: AccountingDocumentDto[]
): AccountingMonth {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(overview.month)) {
    throw new Error('Accounting response contains an invalid month');
  }
  const issues = overview.issues.map(mapIssue);
  const paymentAmount = overview.paymentSummary.totalOutstanding;
  const attentionCount = issues.filter((issue) => issue.kind.toUpperCase() !== 'INFO').length;
  const hasAttention = attentionCount > 0 || overview.nextAction === 'REVIEW';

  return {
    id: overview.month,
    dueLabel: '',
    lifecycle: overview.lifecycle,
    lifecycleLabel: overview.lifecycleLabel,
    nextAction: overview.nextAction,
    nextActionLabel: overview.nextActionLabel,
    totalToPay: requiredMoney(paymentAmount, POLISH_OBLIGATION_CURRENCY),
    matchStatus: hasAttention ? 'WARNING' : 'MATCH',
    taxes: {
      ryczalt: requiredMoney(overview.summary.ryczalt, POLISH_OBLIGATION_CURRENCY),
      vat: requiredMoney(overview.summary.vat, POLISH_OBLIGATION_CURRENCY),
      zus: requiredMoney(overview.summary.zus, POLISH_OBLIGATION_CURRENCY)
    },
    summary: { revenue: requiredMoney(overview.summary.revenue, POLISH_OBLIGATION_CURRENCY) },
    income: mapDocuments(documents.filter((document) => mapDirection(document.type) === 'SALE')),
    costs: mapDocuments(documents.filter((document) => mapDirection(document.type) === 'PURCHASE')),
    payments: overview.paymentSummary.payments.map((payment) => ({
      id: payment.obligationType,
      title: payment.obligationType,
      dueDate: payment.dueDate,
      amount: requiredMoney(payment.amount, POLISH_OBLIGATION_CURRENCY),
      paidAmount: requiredMoney(payment.paidAmount, POLISH_OBLIGATION_CURRENCY),
      outstandingAmount: requiredMoney(payment.outstandingAmount, POLISH_OBLIGATION_CURRENCY),
      status: payment.status,
      period: overview.month
    })),
    attentionCount,
    issues
  };
}
