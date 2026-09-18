import { AccountingDocumentDto, AccountingIssueDto, AccountingMonthOverviewDto } from '../dto/accounting';
import { AccountingIssue, AccountingLine, AccountingMonth, Money } from '../../model/accounting';

function requiredMoney(amount: number, currency?: string | null): Money {
  if (!Number.isFinite(amount)) throw new Error('Accounting response contains an invalid amount');
  return { amount, ...(currency ? { currency } : {}) };
}

function mapIssue(issue: AccountingIssueDto): AccountingIssue {
  return { ...issue, resolution: { ...issue.resolution, options: [...issue.resolution.options] } };
}

function formatDate(date: string | null): string | undefined { return date ? date.slice(0, 10) : undefined; }

function isSale(type: string): boolean {
  return ['SALE', 'SALES', 'INCOME'].includes(type.toUpperCase());
}

function isPurchase(type: string): boolean {
  return ['PURCHASE', 'PURCHASES', 'COST', 'COSTS'].includes(type.toUpperCase());
}

function mapDocument(document: AccountingDocumentDto): AccountingLine {
  const subtitle = [
    document.documentNumber,
    formatDate(document.issueDate ?? document.saleDate),
    document.sourceTypeLabel,
    document.categoryLabel
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id: String(document.id),
    title: document.counterparty ?? document.documentNumber ?? 'Document',
    ...(subtitle ? { subtitle } : {}),
    amount: requiredMoney(document.amount, document.currency),
    state:
      document.status?.toUpperCase() === 'FAILED' ||
      document.reviewStatus?.toUpperCase() === 'REVIEW_REQUIRED'
        ? 'attention'
        : 'ok',
    sourceLabel: document.sourceTypeLabel,
    categoryLabel: document.categoryLabel,
    reviewStatus: document.reviewStatus,
    source: document.source,
    direction: isSale(document.type) ? 'SALE' : 'PURCHASE',
    counterparty: document.counterparty,
    documentNumber: document.documentNumber,
    issueDate: formatDate(document.issueDate ?? document.saleDate) ?? null,
    currency: document.currency,
    paymentStatus: document.paymentStatus,
    ksefStatus: document.importStatus
  };
}

export function mapAccountingMonth(
  overview: AccountingMonthOverviewDto,
  documents: AccountingDocumentDto[]
): AccountingMonth {
  if (!/^\d{4}-\d{2}$/.test(overview.month)) {
    throw new Error('Accounting response contains an invalid month');
  }
  const issues = overview.issues.map(mapIssue);
  const paymentAmount = overview.paymentSummary.totalOutstanding;
  const attentionCount = issues.filter((issue) => issue.kind.toUpperCase() !== 'INFO').length;
  const hasAttention = attentionCount > 0 || overview.nextAction === 'REVIEW';

  return {
    id: overview.month,
    label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
      new Date(`${overview.month}-01T00:00:00`)
    ),
    dueLabel: '',
    lifecycle: overview.lifecycle,
    lifecycleLabel: overview.lifecycleLabel,
    nextAction: overview.nextAction,
    nextActionLabel: overview.nextActionLabel,
    totalToPay: requiredMoney(overview.summary.totalObligations, 'PLN'),
    matchStatus: hasAttention ? 'WARNING' : 'MATCH',
    taxes: {
      ryczalt: requiredMoney(overview.summary.ryczalt, 'PLN'),
      vat: requiredMoney(overview.summary.vat, 'PLN'),
      zus: requiredMoney(overview.summary.zus, 'PLN')
    },
    summary: { revenue: requiredMoney(overview.summary.revenue, 'PLN') },
    income: documents
      .filter((document) => isSale(document.type))
      .map(mapDocument),
    costs: documents
      .filter((document) => isPurchase(document.type))
      .map(mapDocument),
    payments: overview.paymentSummary.payments.map((payment) => ({
      id: payment.obligationType,
      title: payment.obligationType,
      dueDate: payment.dueDate,
      amount: requiredMoney(payment.amount, 'PLN'),
      paidAmount: requiredMoney(payment.paidAmount, 'PLN'),
      outstandingAmount: requiredMoney(payment.outstandingAmount, 'PLN'),
      status: payment.status,
      period: overview.month
    })),
    attentionCount,
    issues
  };
}
