import { HttpClient } from './client';
import { requireApiBaseUrl } from './config';

export type OnboardingState = {
  profileId: number;
  state: 'NOT_STARTED' | 'COMPANY_CONFIRMED' | 'ACCOUNTING_CONFIRMED' | 'COMPLETED';
  nip?: string | null;
  companyName?: string | null;
  regon?: string | null;
  legalForm?: string | null;
  vatStatus?: string | null;
  registeredAddress?: string | null;
  companySource?: string | null;
  zusRegime?: string | null;
  jdgActive?: boolean | null;
  qualifyingUop?: boolean | null;
  voluntarySickness?: boolean | null;
  ksefState?: 'NOT_CONNECTED' | 'SKIPPED' | 'CONNECTED';
};

export type CompanyLookup = {
  nip: string;
  companyName?: string | null;
  regon?: string | null;
  vatStatus?: string | null;
  registeredAddress?: string | null;
  source: string;
};

export function onboardingApi(token: string | null) {
  const client = new HttpClient({ baseUrl: requireApiBaseUrl(), token: () => token });
  const path = (profileId: number) => `/api/profiles/${profileId}/onboarding`;
  return {
    get: (profileId: number) => client.get<OnboardingState>(path(profileId)),
    lookupCompany: (profileId: number, nip: string) => client.post<CompanyLookup>(`${path(profileId)}/company/lookup`, { nip }),
    confirmCompany: (profileId: number, company: CompanyLookup) => client.post<OnboardingState>(`${path(profileId)}/company/confirm`, { ...company }),
    confirmAccounting: (profileId: number) => client.post<OnboardingState>(`${path(profileId)}/accounting/confirm`, {
      legalForm: 'JDG', taxation: 'RYCZALT', ryczaltRate: 12, pitFrequency: 'MONTHLY', vatRegistered: true, vatFrequency: 'MONTHLY', accountingStartDate: '2026-01-01',
    }),
    saveZus: (profileId: number, values: { qualifyingUop: boolean; voluntarySickness: boolean }) => client.post<OnboardingState>(`${path(profileId)}/zus`, {
      jdgActive: true, healthMethod: 'REVENUE_BAND', fullJdgSocial: null, ...values,
    }),
    complete: (profileId: number, ksefState: 'SKIPPED' | 'CONNECTED') => client.post<OnboardingState>(`${path(profileId)}/complete`, { ksefState }),
  };
}
