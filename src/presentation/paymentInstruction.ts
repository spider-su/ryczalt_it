import type { Obligation, PaymentInstruction } from "../model/accounting";
import { formatDate, formatMonth, t } from "../i18n";
import { formatMoney } from "../utils/money";

function normalizedAmount(value: string | null | undefined): string | null {
  if (value == null || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole = "0", fraction = ""] = value.split(".");
  return `${whole.replace(/^0+(?=\d)/, "")}.${(fraction + "00").slice(0, 2)}`;
}

export function paymentInstructionFor(
  obligation: Obligation,
): PaymentInstruction | null {
  const instruction = obligation.paymentInstruction;
  if (
    !instruction ||
    instruction.amount.currency !== obligation.outstandingAmount.currency
  )
    return null;
  const outstanding = normalizedAmount(obligation.outstandingAmount.amount);
  const instructionAmount = normalizedAmount(instruction.amount.amount);
  if (!outstanding || !instructionAmount || outstanding !== instructionAmount)
    return null;
  return instruction;
}

export function paymentDetailsText(
  obligation: Obligation,
  instruction: PaymentInstruction,
): string {
  return [
    `${t("settlements.recipient")}: ${instruction.recipientName}`,
    `${t("settlements.accountNumber")}: ${instruction.accountNumber}`,
    `${t("settlements.amount")}: ${formatMoney(instruction.amount)}`,
    `${t("settlements.titleLabel")}: ${instruction.title}`,
    ...(instruction.taxForm ? [`${t("settlements.taxForm")}: ${instruction.taxForm}`] : []),
    ...(instruction.taxPeriod ? [`${t("settlements.taxPeriod")}: ${instruction.taxPeriod}`] : []),
    `${t("settlements.period")}: ${formatMonth(obligation.period)}`,
    `${t("settlements.dueDate")}: ${obligation.dueDate ? formatDate(obligation.dueDate) : t("settlements.dueDateUnavailable")}`,
  ].join("\n");
}
