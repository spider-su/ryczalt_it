import { createContext, useContext, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react';
import { DEFAULT_ACCOUNTING_MONTH } from '../api/config';

type AccountingMonthContextValue = {
  month: string;
  setMonth: Dispatch<SetStateAction<string>>;
};

const AccountingMonthContext = createContext<AccountingMonthContextValue | null>(null);

export function AccountingMonthProvider({ children }: PropsWithChildren) {
  const [month, setMonth] = useState(DEFAULT_ACCOUNTING_MONTH);
  return <AccountingMonthContext.Provider value={{ month, setMonth }}>{children}</AccountingMonthContext.Provider>;
}

export function useAccountingMonth() {
  const value = useContext(AccountingMonthContext);
  if (!value) throw new Error('useAccountingMonth must be used inside AccountingMonthProvider');
  return value;
}
