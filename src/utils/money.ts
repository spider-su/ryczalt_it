import { Money } from '../model/accounting';

export function formatMoney(money: Money): string {
  const value = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: Number.isInteger(money.amount) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(money.amount);

  if (!money.currency) return value;
  return money.currency === 'PLN' ? `${value} zł` : `${value} ${money.currency}`;
}
