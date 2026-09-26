import { AccountingApi } from "../api/accountingApi";
import {
  mapCounterparty,
  mapCounterpartyRule,
  mapInvoices,
  mapPaymentHistory,
  mapPeriod,
  mapIssues,
  mapObligations,
  mapTransactions,
} from "../api/mappers/accountingMapper";
import type {
  AccountingMonthParts,
  AccountingRepository,
} from "./accountingRepository";
import type {
  AccountingPeriod,
  Counterparty,
  CounterpartyRule,
  Invoice,
  PaymentHistoryLine,
} from "../model/accounting";
import {
  currentLocalAccountingMonth,
  isAccountingMonthAllowed,
  MIN_ACCOUNTING_MONTH,
} from "../utils/calendar";

export class ApiAccountingRepository implements AccountingRepository {
  constructor(
    private readonly api: AccountingApi,
    private readonly profileId: number,
  ) {}
  async getPeriods(): Promise<unknown[]> {
    const periods = await this.api.getPeriods(this.profileId);
    return Array.isArray(periods)
      ? periods.filter(
          (period) =>
            typeof period === "object" &&
            period !== null &&
            typeof (period as { month?: unknown }).month === "string" &&
            isAccountingMonthAllowed((period as { month: string }).month),
        )
      : [];
  }
  async getMonth(month: string): Promise<AccountingPeriod> {
    const parts = await this.getMonthParts(month);
    const failures = Object.entries(parts.failures).map(([dataset, cause]) => ({
      dataset,
      cause,
    }));
    if (failures.length > 0) throw new PartialAccountingError(month, failures);
    if (
      !parts.period ||
      !parts.invoices ||
      !parts.transactions ||
      !parts.obligations ||
      !parts.issues
    ) {
      throw new PartialAccountingError(month, [
        {
          dataset: "unknown",
          cause: new Error("Accounting response was incomplete"),
        },
      ]);
    }
    return {
      ...parts.period,
      invoices: parts.invoices,
      transactions: parts.transactions,
      obligations: parts.obligations,
      issues: parts.issues,
    };
  }
  async getMonthParts(month: string): Promise<AccountingMonthParts> {
    const results = await Promise.allSettled([
      this.api.getPeriod(this.profileId, month),
      this.api.getInvoices(this.profileId, month),
      this.api.getTransactions(this.profileId, month),
      this.api.getObligations(this.profileId, month),
      this.api.getIssues(this.profileId, month),
    ]);
    const names = [
      "period",
      "invoices",
      "transactions",
      "obligations",
      "issues",
    ] as const;
    const failures: AccountingMonthParts["failures"] = {};
    results.forEach((result, index) => {
      if (result.status === "rejected") failures[names[index]!] = result.reason;
    });
    const periodDto =
      results[0].status === "fulfilled" ? results[0].value : null;
    const invoices =
      results[1].status === "fulfilled" ? mapInvoices(results[1].value) : null;
    const transactions =
      results[2].status === "fulfilled"
        ? mapTransactions(results[2].value)
        : null;
    const obligations =
      results[3].status === "fulfilled"
        ? mapObligations(results[3].value, month)
        : null;
    const issues =
      results[4].status === "fulfilled" ? mapIssues(results[4].value) : null;
    return {
      period: periodDto
        ? mapPeriod(
            periodDto,
            results[1].status === "fulfilled" ? results[1].value : [],
            results[2].status === "fulfilled" ? results[2].value : [],
            results[3].status === "fulfilled" ? results[3].value : [],
            results[4].status === "fulfilled" ? results[4].value : [],
          )
        : null,
      invoices,
      transactions,
      obligations,
      issues,
      failures,
    };
  }
  async getInvoicesForRange(month: string, months: number): Promise<Invoice[]> {
    const ids = Array.from({ length: Math.max(1, months) }, (_, index) =>
      shiftMonth(month, -index),
    ).filter((id) => id >= MIN_ACCOUNTING_MONTH);
    return mapInvoices(
      (
        await Promise.all(
          ids.map((id) => this.api.getInvoices(this.profileId, id)),
        )
      ).flat(),
    );
  }
  async getCounterpartyInvoices(counterpartyId: string): Promise<Invoice[]> {
    return mapInvoices(
      await this.api.getCounterpartyInvoices(this.profileId, counterpartyId),
    );
  }
  async markInvoiceManuallyPaid(
    invoiceId: string,
    paidDate: string,
    note?: string,
  ): Promise<void> {
    return this.api.markInvoiceManuallyPaid(
      this.profileId,
      invoiceId,
      paidDate,
      note,
    );
  }
  async clearInvoiceManualPayment(invoiceId: string): Promise<void> {
    return this.api.clearInvoiceManualPayment(this.profileId, invoiceId);
  }
  async markObligationManuallyPaid(
    month: string,
    obligationId: string,
    paidDate: string,
    note?: string,
  ): Promise<void> {
    return this.api.markObligationManuallyPaid(
      this.profileId,
      month,
      obligationId,
      paidDate,
      note,
    );
  }
  async clearObligationManualPayment(
    month: string,
    obligationId: string,
  ): Promise<void> {
    return this.api.clearObligationManualPayment(
      this.profileId,
      month,
      obligationId,
    );
  }
  async getPaymentHistory(
    month: string,
    type?: string,
  ): Promise<PaymentHistoryLine[]> {
    return mapPaymentHistory(
      await this.api.getPayments(this.profileId, month, month, type),
    );
  }
  async getCounterparties(): Promise<Counterparty[]> {
    return (await this.api.getCounterparties(this.profileId)).map(
      mapCounterparty,
    );
  }
  async getCounterpartyRules(
    counterpartyId: string,
  ): Promise<CounterpartyRule[]> {
    return (
      await this.api.getCounterpartyRules(this.profileId, counterpartyId)
    ).map(mapCounterpartyRule);
  }
  async calculatePeriod(month: string): Promise<void> {
    await this.api.calculate(this.profileId, month);
  }
  async performPeriodAction(
    month: string,
    action: "FREEZE" | "REOPEN",
  ): Promise<void> {
    if (action === "FREEZE") return this.api.freeze(this.profileId, month);
    return this.api.reopen(this.profileId, month);
  }
  getCurrentMonth(): Promise<AccountingPeriod> {
    return this.getMonth(currentLocalAccountingMonth());
  }
}
export class PartialAccountingError extends Error {
  readonly kind = "partial-accounting";
  constructor(
    readonly month: string,
    readonly failures: Array<{ dataset: string; cause: unknown }>,
  ) {
    super(
      `Accounting data for ${month} could not be loaded completely: ${failures.map(({ dataset }) => dataset).join(", ")}`,
    );
    this.name = "PartialAccountingError";
  }
}
function shiftMonth(value: string, offset: number): string {
  const date = new Date(`${value}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
