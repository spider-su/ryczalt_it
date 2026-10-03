import { HttpClient } from "./client";
import { requireApiBaseUrl } from "./config";

export type ReadinessItem = {
  code: string;
  status: "COMPLETE" | "ACTION_REQUIRED" | "OPTIONAL";
  action: string | null;
};
export type PeriodReadinessState =
  | "NO_DATA"
  | "CONFIRMED_NO_ACTIVITY"
  | "DATA_AVAILABLE"
  | "HISTORICAL_DATA_MISSING"
  | "RETRIEVAL_FAILED";
export type CalculationReadinessStatus =
  "COMPLETE" | "INCOMPLETE" | "UNAVAILABLE" | "ERROR";
export type Readiness = {
  onboardingComplete: boolean;
  companyConfigured: boolean;
  accountingConfigured: boolean;
  zusConfigured: boolean;
  ksef: {
    configuration: "NOT_CONNECTED" | "SKIPPED" | "CONNECTED";
    sync: "NOT_AVAILABLE" | "PENDING" | "SUCCEEDED" | "FAILED";
  };
  period: {
    month: string;
    state: PeriodReadinessState;
    confirmationType?: string | null;
  };
  calculations: {
    type: string;
    status: CalculationReadinessStatus;
    issueCodes: string[];
    reason?: string | null;
  }[];
  items: ReadinessItem[];
  showWelcome?: boolean;
};

export function accountingReadinessApi(token: string | null) {
  const client = new HttpClient({
    baseUrl: requireApiBaseUrl(),
    token: () => token,
  });
  return {
    getReadiness: (profileId: number, period: string) =>
      client.get<Readiness>(
        `/api/profiles/${profileId}/accounting/readiness?month=${encodeURIComponent(period)}`,
      ),
    confirmNoActivity: (profileId: number, period: string) =>
      client.post<{ type: string; confirmedAt: string }>(
        `/api/profiles/${profileId}/accounting/periods/${encodeURIComponent(period)}/activity-confirmation`,
        { type: "NO_REVENUE" },
      ),
  };
}
