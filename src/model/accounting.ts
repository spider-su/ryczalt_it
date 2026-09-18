export type Money = {
  amount: number;
  currency?: string;
};

export type AccountingLine = {
  id: string;
  title: string;
  subtitle?: string;
  amount: Money;
  state?: 'ok' | 'attention';
  sourceLabel?: string | null;
  categoryLabel?: string | null;
  reviewStatus?: string | null;
  source?: string | null;
  direction?: 'SALE' | 'PURCHASE' | 'UNKNOWN';
  counterparty?: string | null;
  documentNumber?: string | null;
  issueDate?: string | null;
  nip?: string | null;
  currency?: string | null;
  paymentStatus?: string | null;
  ksefStatus?: string | null;
};

export type PaymentLine = {
  id: string;
  title: string;
  dueDate: string;
  amount: Money;
  paidAmount: Money;
  outstandingAmount: Money;
  status: string;
  period?: string;
};

export type AccountingIssue = {
  id: string;
  code: string;
  severity: string;
  kind: string;
  title: string;
  message: string;
  sourceReference?: string | null;
  resolution: {
    type: string;
    command?: string | null;
    options: { value: string; label: string; recommended: boolean }[];
    settingsPath?: string | null;
    actionLabel?: string | null;
    reason?: string | null;
  };
};

export type AccountingMonth = {
  id: string;
  label: string;
  dueLabel: string;
  lifecycle?: string;
  lifecycleLabel?: string;
  nextAction?: string;
  nextActionLabel?: string;
  totalToPay: Money;
  matchStatus: 'MATCH' | 'WARNING';
  taxes: {
    ryczalt: Money;
    vat: Money;
    zus: Money;
  };
  summary: { revenue: Money; costs?: Money; income?: Money };
  income: AccountingLine[];
  costs: AccountingLine[];
  payments: PaymentLine[];
  attentionCount: number;
  issues: AccountingIssue[];
};
