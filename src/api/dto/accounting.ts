export type AccountingMonthOverviewDto = {
  month: string;
  lifecycle: string;
  lifecycleLabel: string;
  nextAction: string;
  nextActionLabel: string;
  summary: {
    revenue: number;
    vat: number;
    ryczalt: number;
    zus: number;
    documents: number;
    bankTransactions: number;
    totalObligations: number;
  };
  issues: AccountingIssueDto[];
  sources: { evidenceCount: number; imported: number; reviewRequired: number; failed: number };
  ksefStatus: string;
  documentSummary: {
    salesCount: number;
    purchaseCount: number;
    totalCount: number;
    reviewRequired: number;
    failed: number;
  };
  bankSummary: { transactionCount: number; unmatchedCount: number; importStatus: string };
  paymentSummary: {
    expectedCount: number;
    outstandingCount: number;
    totalOutstanding: number;
    payments: {
      obligationType: string;
      amount: number;
      paidAmount: number;
      outstandingAmount: number;
      dueDate: string;
      status: string;
    }[];
  };
  filingSummary: {
    lifecycle: string;
    lifecycleLabel: string;
    ready: boolean;
    issues: string[];
    jpkStatus: string;
    jpkGeneratedAt: string | null;
    upoStatus: string;
    upoReference: string | null;
    upoReceivedAt: string | null;
  };
  reconciliationSummary: {
    rowCount: number;
    settledCount: number;
    mismatchCount: number;
    missingEvidenceCount: number;
  };
  allowedActions: string[];
};

export type AccountingIssueDto = {
  id: string;
  code: string;
  severity: string;
  kind: string;
  title: string;
  message: string;
  sourceReference: string | null;
  resolution: {
    type: string;
    command: string | null;
    options: { value: string; label: string; recommended: boolean }[];
    settingsPath: string | null;
    actionLabel: string | null;
    reason: string | null;
  };
};

export type AccountingDocumentDto = {
  id: number;
  type: string;
  counterparty: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  saleDate: string | null;
  category: string | null;
  source: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  sourceType: string | null;
  sourceTypeLabel: string | null;
  categoryLabel: string | null;
  importStatus: string | null;
  reviewStatus: string | null;
  paymentStatus: string | null;
};

export type CounterpartyDto = {
  id: number;
  taxIdentifier: string | null;
  country: string | null;
  name: string;
  alias: string | null;
  documentCount: number;
};

export type CandidateDto = {
  sourceReference: string;
  documentType: string;
  issueDate: string | null;
  saleDate: string | null;
  dueDate: string | null;
  reference: string | null;
  seller: string | null;
  buyer: string | null;
  sellerNip: string | null;
  buyerNip: string | null;
  category: string | null;
  currency: string | null;
  netAmount: number | null;
  vatAmount: number | null;
  grossAmount: number | null;
  note: string | null;
  status: string;
};

export type ReviewedDocumentDto = {
  sourceReference: string;
  documentType: string;
  issueDate: string | null;
  saleDate: string | null;
  dueDate: string | null;
  reference: string | null;
  counterpartyAlias: string | null;
  counterpartyTaxIdentifier: string | null;
  counterpartyCountry: string | null;
  category: string | null;
  currency: string | null;
  netAmount: number | null;
  vatAmount: number | null;
  grossAmount: number | null;
  vatDeductionRatio: number | null;
  vatTreatment: string | null;
  note: string | null;
  taxPeriod: string;
  vatRate: number | null;
  correctsDocumentReference?: string | null;
};
