import type { AccountingPeriod, Invoice, Obligation, PaymentHistoryLine } from '../../model/accounting';
import { july2026, july2026Invoices } from './july2026';

const monthAmounts = [
  ['4100.00', '2800.00', '1495.04'], ['4320.00', '3010.00', '1495.04'],
  ['4580.00', '3190.00', '1495.04'], ['4743.00', '3320.00', '1495.04'],
  ['5012.00', '3410.00', '1495.04'], ['5360.00', '3520.00', '1495.04'],
  ['5791.00', '3557.00', '1495.04'], ['7038.00', '5969.00', '1495.04'],
  ['0.00', '0.00', '0.00']
] as const;
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
function addMoney(values: string[]): string {
  const cents = values.reduce((total, value) => {
    const [whole = '0', fraction = ''] = value.split('.');
    return total + BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  }, 0n);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function invoicesForMonth(index: number): Invoice[] {
  const month = String(index + 1).padStart(2, '0');
  return july2026Invoices.map((invoice, invoiceIndex) => {
    const issueDate = `2026-${month}-${String([31, 2, 18, 22][invoiceIndex]).padStart(2, '0')}`;
    const date = new Date(`${issueDate}T00:00:00Z`);
    if (date.getUTCMonth() !== index) date.setUTCDate(28);
    const actualDate = date.toISOString().slice(0, 10);
    const paid = index < 7;
    const partial = index === 7 && invoiceIndex === 1;
    return {
      ...invoice,
      id: `${invoice.id}-2026-${month}`,
      issueDate: actualDate,
      subtitle: `${invoice.documentNumber ?? 'Invoice'} · ${Number(actualDate.slice(8, 10))} ${monthNames[index]}`,
      approvalStatus: 'APPROVED',
      approvalSource: invoice.approvalSource ?? 'MANUAL',
      paymentVerificationPolicy: 'REQUIRED',
      paymentStatus: paid ? 'MATCHED' : partial ? 'PARTIALLY_MATCHED' : 'UNMATCHED'
    };
  });
}

function obligationsForMonth(index: number): Obligation[] {
  const [ryczalt, vat, zus] = monthAmounts[index]!;
  const amounts = [ryczalt, vat, zus];
  return amounts.map((amount, obligationIndex) => {
    const paid = index < 7;
    const partiallyPaid = index === 7 && obligationIndex === 1;
    const paidAmount = paid ? amount : partiallyPaid ? '1200.00' : '0.00';
    const outstanding = paid ? '0.00' : partiallyPaid ? '4769.00' : amount;
    const dueMonth = String(Math.min(index + 2, 12)).padStart(2, '0');
    const dueDay = obligationIndex === 1 ? '25' : '20';
    return {
      id: `${['ryczalt', 'vat', 'zus'][obligationIndex]}-2026-${String(index + 1).padStart(2, '0')}`,
      title: ['RYCZALT', 'VAT', 'ZUS'][obligationIndex]!,
      period: `2026-${String(index + 1).padStart(2, '0')}`,
      dueDate: `2026-${dueMonth}-${dueDay}`,
      amount: { amount, currency: 'PLN' },
      paidAmount: { amount: paidAmount, currency: 'PLN' },
      outstandingAmount: { amount: outstanding, currency: 'PLN' },
      status: paid ? 'PAID' : partiallyPaid ? 'PARTIALLY_PAID' : 'OPEN'
    };
  });
}

function periodForMonth(index: number): AccountingPeriod {
  const id = `2026-${String(index + 1).padStart(2, '0')}`;
  const invoices = invoicesForMonth(index);
  const obligations = obligationsForMonth(index);
  const paidCount = obligations.filter((item) => item.status === 'PAID').length;
  const totalExpected = addMoney(obligations.map((item) => item.amount.amount ?? '0'));
  const totalPaid = addMoney(obligations.map((item) => item.paidAmount.amount ?? '0'));
  const totalOutstanding = addMoney(obligations.map((item) => item.outstandingAmount.amount ?? '0'));
  const frozen = index < 7;
  const current = index === 8;
  const calculations = current ? [] : obligations.map((item) => ({ type: item.title, status: frozen ? 'FROZEN' : 'CALCULATED', amount: item.amount }));
  return {
    ...july2026,
    id,
    status: frozen ? 'FROZEN' : 'OPEN',
    summary: {
      revenue: { amount: current ? '0.00' : index === 7 ? '48200.00' : '49159.00', currency: 'PLN' },
      ryczalt: { amount: current ? '0.00' : obligations[0]!.amount.amount, currency: 'PLN' },
      vat: { amount: current ? '0.00' : obligations[1]!.amount.amount, currency: 'PLN' },
      zus: { amount: current ? '0.00' : obligations[2]!.amount.amount, currency: 'PLN' }
    },
    documents: { invoiceCount: current ? 0 : invoices.length, transactionCount: current ? 0 : invoices.length },
    settlement: { expectedCount: current ? 0 : obligations.length, paidCount, outstandingCount: obligations.length - paidCount, totalExpected: { amount: totalExpected, currency: 'PLN' }, totalPaid: { amount: totalPaid, currency: 'PLN' }, totalOutstanding: { amount: totalOutstanding, currency: 'PLN' }, fullySettled: !current && totalOutstanding === '0.00' },
    reconciliation: { rowCount: invoices.length, settledCount: invoices.filter((invoice) => invoice.paymentStatus === 'MATCHED').length, mismatchCount: 0, missingEvidenceCount: 0, state: 'healthy' },
    completeness: { status: current ? 'INCOMPLETE' : 'COMPLETE', blockingIssueCount: current ? 1 : 0 },
    calculations,
    allowedActions: frozen ? ['REOPEN'] : current ? [] : ['SETTLE'],
    invoices: current ? [] : invoices,
    transactions: [],
    obligations: current ? [] : obligations,
    issues: current ? [{ id: 'sep-waiting-calculation', code: 'CALCULATION_PENDING', severity: 'INFO', kind: 'INFO', title: 'Waiting for calculations', message: 'Current month calculations are not available yet.', sourceReference: null }] : []
  };
}

export const accounting2026Periods: AccountingPeriod[] = Array.from({ length: 9 }, (_, index) => periodForMonth(index));
export const accounting2026Invoices: Invoice[] = accounting2026Periods.flatMap((period) => period.invoices);

export function paymentHistoryForMonth(month: string): PaymentHistoryLine[] {
  const period = accounting2026Periods.find((item) => item.id === month);
  return period?.obligations.filter((item) => Number(item.paidAmount.amount ?? '0') > 0).map((item) => ({
    ...item,
    paymentDate: item.status === 'PAID' ? `${month}-28` : `${month}-25`
  })) ?? [];
}
