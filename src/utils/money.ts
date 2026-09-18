import { Money } from '../model/accounting';
import { formatCurrency } from '../i18n';

export function formatMoney(money: Money): string {
  return formatCurrency(money.amount, money.currency);
}
