/** Decimal values are strings on the API; number remains accepted during rollout for old fixtures. */
export type Decimal = string | number;

export type AccountingMonthOverviewDto = {
  month: string;
  lifecycle: string;
  lifecycleLabel: string;
  nextAction: string;
  nextActionLabel: string;
  summary: {
    revenue: Decimal;
    vat: Decimal;
    ryczalt: Decimal;
    zus: Decimal;
    documents: number;
    bankTransactions: number;
    totalObligations: Decimal;
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
    totalOutstanding: Decimal;
    payments: {
      obligationType: string;
      amount: Decimal;
      paidAmount: Decimal;
      outstandingAmount: Decimal;
      dueDate: string | null;
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

export type AutoApprovalSettingsDto = {
  enabled: boolean;
  maxAmount: string;
  trustedCategories: string[];
};

export type AccountingIssueDto = {
  id: string;
  code: string;
  severity: string;
  kind: string;
  title: string | null;
  message: string | null;
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
  amount: Decimal;
  currency: string | null;
  status: string | null;
  sourceType: string | null;
  sourceTypeLabel: string | null;
  categoryLabel: string | null;
  importStatus: string | null;
  reviewStatus: string | null;
  paymentStatus: string | null;
  documentKind?: string | null;
  correctsDocumentId?: number | null;
  correctsDocumentReference?: string | null;
};

export type PaymentHistoryDto = {
  type: string;
  period: string;
  amount: Decimal | null;
  paidAmount: Decimal | null;
  outstandingAmount: Decimal | null;
  dueDate: string | null;
  paymentDate: string | null;
  status: string | null;
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
  netAmount: Decimal | null;
  vatAmount: Decimal | null;
  grossAmount: Decimal | null;
  note: string | null;
  status: string;
  vatTreatment?: string | null;
  vatRate?: Decimal | null;
  vatTreatmentOptions?: { value: string; label: string; recommended: boolean }[];
  requiredInputs?: RequiredInputDto[];
  duplicate?: boolean;
  existingDocumentId?: number | null;
};

export type RequiredInputDto = {
  field: string;
  inputType: string;
  label: string;
  required: boolean;
  options: { value: string; label: string; recommended: boolean }[];
  dependsOn: string | null;
  dependsOnValues: string[];
};

export type DocumentMutationDto = {
  documentId: number | null;
  reference: string | null;
  status: string;
  ksefStatus: string | null;
  duplicate: boolean;
  existingDocumentId: number | null;
  message: string | null;
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
  netAmount: Decimal | null;
  vatAmount: Decimal | null;
  grossAmount: Decimal | null;
  vatDeductionRatio: number | null;
  vatTreatment: string | null;
  note: string | null;
  taxPeriod: string | null;
  vatRate: Decimal | null;
  correctsDocumentReference?: string | null;
};
