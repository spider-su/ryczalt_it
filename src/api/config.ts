import { AccountingApi } from './accountingApi';
import { ConfigurationError, HttpClient } from './client';
import { AccountingRepository } from '../data/accountingRepository';
import { ApiAccountingRepository } from '../data/apiAccountingRepository';
import { MockAccountingRepository } from '../data/mockAccountingRepository';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://investory-61359240267.europe-central2.run.app/';
export const ACCOUNTING_DATA_SOURCE = process.env.EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE ?? 'api';
export const DEFAULT_ACCOUNTING_MONTH =
  process.env.EXPO_PUBLIC_ACCOUNTING_MONTH ?? new Date().toISOString().slice(0, 7);
let authToken: string | null = null;
export function setAccountingAuthToken(token: string | null) { authToken = token; }
let accountingProfileId: number | null = null;
export function setAccountingProfileId(profileId: number | null) { accountingProfileId = profileId; }
export function requireAccountingProfileId(): number {
  if (accountingProfileId == null) throw new ConfigurationError('Authenticated accounting profile is unavailable');
  return accountingProfileId;
}
let authFailureHandler: (() => void) | null = null;
export function setAccountingAuthFailureHandler(handler: (() => void) | null) { authFailureHandler = handler; }

export function createAccountingRepository(): AccountingRepository {
  if (ACCOUNTING_DATA_SOURCE === 'mock') return new MockAccountingRepository();
  if (ACCOUNTING_DATA_SOURCE !== 'api') {
    throw new Error(`Unsupported accounting data source: ${ACCOUNTING_DATA_SOURCE}`);
  }
  const profileId = requireAccountingProfileId();
  return new ApiAccountingRepository(
    new AccountingApi(new HttpClient({ baseUrl: API_BASE_URL, token: () => authToken, onUnauthorized: () => authFailureHandler?.() })),
    profileId
  );
}

export function createAccountingApi(): AccountingApi {
  if (ACCOUNTING_DATA_SOURCE !== 'api') throw new ConfigurationError('Accounting actions require the API data source');
  return new AccountingApi(new HttpClient({ baseUrl: API_BASE_URL, token: () => authToken, onUnauthorized: () => authFailureHandler?.() }));
}
