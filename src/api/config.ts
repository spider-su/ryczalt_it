import { AccountingApi } from "./accountingApi";
import { ConfigurationError, HttpClient } from "./client";
import { AccountingRepository } from "../data/accountingRepository";
import { ApiAccountingRepository } from "../data/apiAccountingRepository";
import { MockAccountingRepository } from "../data/mockAccountingRepository";
import {
  clampAccountingMonth,
  currentLocalAccountingMonth,
} from "../utils/calendar";
import { DEMO_ACCOUNTING_MONTH } from "../auth/demoSession";

export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "")
  .trim()
  .replace(/\/$/, "");
export function requireApiBaseUrl(): string {
  if (!API_BASE_URL)
    throw new ConfigurationError(
      `Investory API URL is required for ${APP_ENV} API mode`,
    );
  if (!/^https?:\/\//.test(API_BASE_URL))
    throw new ConfigurationError(
      "Investory API URL is not configured correctly",
    );
  return API_BASE_URL;
}
export const ACCOUNTING_DATA_SOURCE =
  process.env.EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE ?? "api";
export const DEFAULT_ACCOUNTING_MONTH = clampAccountingMonth(
  process.env.EXPO_PUBLIC_ACCOUNTING_MONTH ?? currentLocalAccountingMonth(),
);
let demoMode = false;
export function setDemoMode(enabled: boolean) {
  demoMode = enabled;
}
export function isDemoMode() {
  return demoMode;
}
export function initialAccountingMonth(
  dataSource: string,
  isDemo: boolean,
  liveDefault: string,
  mockDefault: string,
): string {
  return isDemo || dataSource === "mock" ? mockDefault : liveDefault;
}
export function getInitialAccountingMonth() {
  return initialAccountingMonth(
    ACCOUNTING_DATA_SOURCE,
    demoMode,
    DEFAULT_ACCOUNTING_MONTH,
    DEMO_ACCOUNTING_MONTH,
  );
}
let authToken: string | null = null;
export function setAccountingAuthToken(token: string | null) {
  authToken = token;
}
let accountingProfileId: number | null = null;
export function setAccountingProfileId(profileId: number | null) {
  accountingProfileId = profileId;
}
export function requireAccountingProfileId(): number {
  if (accountingProfileId == null)
    throw new ConfigurationError(
      "Authenticated accounting profile is unavailable",
    );
  return accountingProfileId;
}
let authFailureHandler: (() => void) | null = null;
export function setAccountingAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

export function createAccountingRepository(): AccountingRepository {
  if (demoMode) return new MockAccountingRepository();
  if (ACCOUNTING_DATA_SOURCE === "mock") return new MockAccountingRepository();
  if (ACCOUNTING_DATA_SOURCE !== "api") {
    throw new Error(
      `Unsupported accounting data source: ${ACCOUNTING_DATA_SOURCE}`,
    );
  }
  const profileId = requireAccountingProfileId();
  return new ApiAccountingRepository(
    new AccountingApi(
      new HttpClient({
        baseUrl: requireApiBaseUrl(),
        token: () => authToken,
        onUnauthorized: () => authFailureHandler?.(),
      }),
    ),
    profileId,
  );
}

export function createAccountingApi(): AccountingApi {
  if (demoMode || ACCOUNTING_DATA_SOURCE !== "api")
    throw new ConfigurationError(
      "Accounting actions require the API data source",
    );
  return new AccountingApi(
    new HttpClient({
      baseUrl: requireApiBaseUrl(),
      token: () => authToken,
      onUnauthorized: () => authFailureHandler?.(),
    }),
  );
}
