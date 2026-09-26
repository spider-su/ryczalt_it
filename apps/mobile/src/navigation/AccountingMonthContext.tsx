import { createContext, useContext, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react';
import { getInitialAccountingMonth } from '../api/config';
import { clampAccountingMonth, currentLocalAccountingMonth, MIN_ACCOUNTING_MONTH } from '../utils/calendar';

type AccountingMonthContextValue = {
  month: string;
  setMonth: Dispatch<SetStateAction<string>>;
  previousMonth: () => void;
  nextMonth: () => void;
  canGoNext: boolean;
  refreshVersion: number;
  refreshAccounting: () => void;
};

const AccountingMonthContext = createContext<AccountingMonthContextValue | null>(null);

export function AccountingMonthProvider({ children }: PropsWithChildren) {
  const [month, setMonth] = useState(() => clampAccountingMonth(getInitialAccountingMonth()));
  const [refreshVersion, setRefreshVersion] = useState(0);
  const latestId = currentLocalAccountingMonth();
  const shift = (value: string, offset: number) => {
    const date = new Date(`${value}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    return date.toISOString().slice(0, 7);
  };
  const setAllowedMonth: Dispatch<SetStateAction<string>> = (next) => setMonth((current) => clampAccountingMonth(typeof next === 'function' ? next(current) : next));
  return <AccountingMonthContext.Provider value={{
    month,
    setMonth: setAllowedMonth,
    previousMonth: () => setAllowedMonth((value) => shift(value, -1)),
    nextMonth: () => setMonth((value) => shift(value, 1)),
    canGoNext: month < latestId,
    refreshVersion,
    refreshAccounting: () => setRefreshVersion((value) => value + 1)
  }}>{children}</AccountingMonthContext.Provider>;
}

export function useAccountingMonth() {
  const value = useContext(AccountingMonthContext);
  if (!value) throw new Error('useAccountingMonth must be used inside AccountingMonthProvider');
  return value;
}
