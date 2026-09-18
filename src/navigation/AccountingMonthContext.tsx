import { createContext, useContext, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react';
import { DEFAULT_ACCOUNTING_MONTH } from '../api/config';

type AccountingMonthContextValue = {
  month: string;
  setMonth: Dispatch<SetStateAction<string>>;
  previousMonth: () => void;
  nextMonth: () => void;
  canGoNext: boolean;
};

const AccountingMonthContext = createContext<AccountingMonthContextValue | null>(null);

export function AccountingMonthProvider({ children }: PropsWithChildren) {
  const [month, setMonth] = useState(DEFAULT_ACCOUNTING_MONTH);
  const latest = new Date();
  const latestId = latest.toISOString().slice(0, 7);
  const shift = (value: string, offset: number) => {
    const date = new Date(`${value}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    return date.toISOString().slice(0, 7);
  };
  return <AccountingMonthContext.Provider value={{
    month,
    setMonth,
    previousMonth: () => setMonth((value) => shift(value, -1)),
    nextMonth: () => setMonth((value) => shift(value, 1)),
    canGoNext: month < latestId
  }}>{children}</AccountingMonthContext.Provider>;
}

export function useAccountingMonth() {
  const value = useContext(AccountingMonthContext);
  if (!value) throw new Error('useAccountingMonth must be used inside AccountingMonthProvider');
  return value;
}
