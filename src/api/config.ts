import { AccountingApi } from './accountingApi';
import { HttpClient } from './client';
import { AccountingRepository } from '../data/accountingRepository';
import { ApiAccountingRepository } from '../data/apiAccountingRepository';
import { MockAccountingRepository } from '../data/mockAccountingRepository';

export const ACCOUNTING_PROFILE_ID = 1;
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
export const ACCOUNTING_DATA_SOURCE = process.env.EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE ?? 'api';
export const DEFAULT_ACCOUNTING_MONTH =
  process.env.EXPO_PUBLIC_ACCOUNTING_MONTH ?? new Date().toISOString().slice(0, 7);

export function createAccountingRepository(): AccountingRepository {
  if (ACCOUNTING_DATA_SOURCE === 'mock') return new MockAccountingRepository();
  if (ACCOUNTING_DATA_SOURCE !== 'api') {
    throw new Error(`Unsupported accounting data source: ${ACCOUNTING_DATA_SOURCE}`);
  }
  return new ApiAccountingRepository(
    new AccountingApi(new HttpClient({ baseUrl: API_BASE_URL })),
    ACCOUNTING_PROFILE_ID
  );
}
