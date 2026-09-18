import { AccountingDocumentDto, AccountingIssueDto, AccountingMonthOverviewDto, Decimal, PaymentHistoryDto } from '../dto/accounting';
import { AccountingIssue, AccountingLine, AccountingMonth, AccountingStatus, BankSummary, FilingSummary, Money, PaymentHistoryLine, ReconciliationSummary } from '../../model/accounting';

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
  const raw = issue as Partial<AccountingIssueDto>;
  const resolution = (raw.resolution ?? {}) as Partial<AccountingIssueDto['resolution']>;
  return {
    id: typeof raw.id === 'string' ? raw.id : 'unknown-issue',
    code: typeof raw.code === 'string' && raw.code.trim() ? raw.code : 'UNKNOWN_ISSUE',
    severity: typeof raw.severity === 'string' ? raw.severity : 'UNKNOWN',
    kind: typeof raw.kind === 'string' ? raw.kind : 'UNKNOWN',
    title: typeof raw.title === 'string' ? raw.title : null,
    message: typeof raw.message === 'string' ? raw.message : null,
    sourceReference: typeof raw.sourceReference === 'string' ? raw.sourceReference : null,
    resolution: {
      type: typeof resolution.type === 'string' ? resolution.type : 'NONE',
      command: typeof resolution.command === 'string' ? resolution.command : null,
      options: Array.isArray(resolution.options) ? resolution.options.filter(Boolean).map((option) => ({
        value: typeof option.value === 'string' ? option.value : '',
        label: typeof option.label === 'string' ? option.label : '',
        recommended: option.recommended === true
      })) : [],
      settingsPath: typeof resolution.settingsPath === 'string' ? resolution.settingsPath : null,
      actionLabel: typeof resolution.actionLabel === 'string' ? resolution.actionLabel : null,
      reason: typeof resolution.reason === 'string' ? resolution.reason : null
    }
  };
}

function isActionableIssue(issue: Pick<AccountingIssue, 'severity' | 'kind'>): boolean {
  const severity = String(issue.severity ?? '').toUpperCase();
  const kind = String(issue.kind ?? '').toUpperCase();
  return [
    'ERROR', 'CRITICAL', 'BLOCKING', 'WARNING', 'ACTION', 'REVIEW', 'REQUIRES_ACTION', 'NEEDS_ANSWER'
  ].includes(severity) || [
    'BLOCKED', 'WARNING', 'ACTION', 'REVIEW', 'REQUIRES_ACTION', 'NEEDS_ANSWER', 'SETUP'
  ].includes(kind);
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

  const importStatus = document.importStatus?.toUpperCase();
  const reviewStatus = document.reviewStatus?.toUpperCase();
  const state = importStatus === 'FAILED' || reviewStatus === 'REVIEW_REQUIRED'
    ? 'attention'
    : importStatus && ['IMPORTED', 'PARSED', 'PROMOTED', 'STAGED', 'CREATED'].includes(importStatus)
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
    importStatus: document.importStatus,
    sourceType: document.sourceType,
    sourceTypeLabel: document.sourceTypeLabel,
    direction: mapDirection(document.type),
    counterparty: document.counterparty,
    documentNumber: document.documentNumber,
    issueDate: formatDate(document.issueDate ?? document.saleDate) ?? null,
    currency: document.currency,
    paymentStatus: document.paymentStatus,
    ksefStatus: document.sourceType?.toUpperCase() === 'KSEF' ? document.importStatus : null,
    documentKind: document.documentKind,
    correctsDocumentId: document.correctsDocumentId == null ? null : String(document.correctsDocumentId),
    correctsDocumentReference: document.correctsDocumentReference
  };
}

export function mapDocuments(documents: AccountingDocumentDto[]): AccountingLine[] {
  return documents.map(mapDocument);
}

export function mapReconciliationSummary(summary: AccountingMonthOverviewDto['reconciliationSummary']): ReconciliationSummary {
  const rowCount = summary?.rowCount ?? null;
  const settledCount = summary?.settledCount ?? null;
  const mismatchCount = summary?.mismatchCount ?? null;
  const missingEvidenceCount = summary?.missingEvidenceCount ?? null;
  const state = [rowCount, settledCount, mismatchCount, missingEvidenceCount].some((value) => value == null)
    ? 'unknown'
    : missingEvidenceCount > 0
      ? 'missing_evidence'
      : mismatchCount > 0
        ? 'mismatch'
        : settledCount === rowCount
          ? 'healthy'
          : 'unknown';
  return { rowCount, settledCount, mismatchCount, missingEvidenceCount, state };
}

export function mapBankSummary(summary: AccountingMonthOverviewDto['bankSummary']): BankSummary {
  const transactionCount = summary?.transactionCount ?? null;
  const unmatchedCount = summary?.unmatchedCount ?? null;
  const importStatus = summary?.importStatus ?? null;
  const normalized = importStatus?.toUpperCase();
  const state = normalized === 'FAILED' || normalized === 'ERROR'
    ? 'failed'
    : normalized === 'PENDING' || normalized === 'IMPORTING' || normalized === 'SYNCING'
      ? 'pending'
      : normalized === 'NO_IMPORT'
        ? 'unavailable'
        : normalized === 'IMPORTED' && unmatchedCount != null
          ? unmatchedCount > 0 ? 'unmatched' : 'matched'
          : 'unknown';
  return { transactionCount, unmatchedCount, importStatus, state };
}

function mapFilingSummary(summary: AccountingMonthOverviewDto['filingSummary']): FilingSummary {
  return {
    lifecycle: summary?.lifecycle ?? null,
    lifecycleLabel: summary?.lifecycleLabel ?? null,
    ready: summary?.ready ?? null,
    issues: [...(summary?.issues ?? [])],
    jpkStatus: summary?.jpkStatus ?? null,
    jpkGeneratedAt: summary?.jpkGeneratedAt ?? null,
    upoStatus: summary?.upoStatus ?? null,
    upoReference: summary?.upoReference ?? null,
    upoReceivedAt: summary?.upoReceivedAt ?? null
  };
}

function mapStatus(overview: AccountingMonthOverviewDto): AccountingStatus {
  const sources = overview.sources;
  const documents = overview.documentSummary;
  return {
    lifecycle: overview.lifecycle ?? null,
    lifecycleLabel: overview.lifecycleLabel ?? null,
    nextAction: overview.nextAction ?? null,
    nextActionLabel: overview.nextActionLabel ?? null,
    sources: {
      evidenceCount: sources?.evidenceCount ?? null,
      imported: sources?.imported ?? null,
      reviewRequired: sources?.reviewRequired ?? null,
      failed: sources?.failed ?? null
    },
    ksefStatus: overview.ksefStatus ?? null,
    documentSummary: {
      salesCount: documents?.salesCount ?? null,
      purchaseCount: documents?.purchaseCount ?? null,
      totalCount: documents?.totalCount ?? null,
      reviewRequired: documents?.reviewRequired ?? null,
      failed: documents?.failed ?? null
    },
    bankSummary: mapBankSummary(overview.bankSummary),
    filingSummary: mapFilingSummary(overview.filingSummary),
    reconciliationSummary: mapReconciliationSummary(overview.reconciliationSummary),
    allowedActions: [...(overview.allowedActions ?? [])]
  };
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
  const issues = (Array.isArray(overview.issues) ? overview.issues : []).filter(Boolean).map(mapIssue);
  const paymentAmount = overview.paymentSummary.totalOutstanding;
  // Unknown issue values stay neutral until the backend contract defines them.
  const attentionCount = issues.filter(isActionableIssue).length;
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
    issues,
    status: mapStatus(overview)
  };
}
