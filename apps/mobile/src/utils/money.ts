import { Money } from '../model/accounting';
import { formatCurrency } from '../i18n';

export function formatMoney(money: Money): string {
  return formatCurrency(money.amount, money.currency);
}

export function formatMoneyWithoutCurrency(money: Money): string {
  return formatCurrency(money.amount);
}

export function formatMoneyWithCurrencyCode(money: Money): string {
  const amount = formatMoneyWithoutCurrency(money);
  return money.currency ? `${amount} ${money.currency}` : amount;
}
