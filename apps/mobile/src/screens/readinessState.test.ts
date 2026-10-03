import { describe, expect, it } from "vitest";
import {
  initialReadinessState,
  readinessReducer,
  type ReadinessState,
} from "./readinessState";
import type { Readiness } from "../api/accountingReadinessApi";

const readiness: Readiness = {
  onboardingComplete: true,
  companyConfigured: true,
  accountingConfigured: true,
  zusConfigured: true,
  ksef: { configuration: "SKIPPED", sync: "NOT_AVAILABLE" },
  period: { month: "2026-10", state: "DATA_AVAILABLE" },
  calculations: [],
  items: [],
};

describe("Home readiness loading state", () => {
  it("transitions from loading to success", () => {
    expect(
      readinessReducer(initialReadinessState, {
        type: "success",
        value: readiness,
      }),
    ).toEqual({ status: "ready", value: readiness });
  });

  it("transitions from loading to error", () => {
    expect(
      readinessReducer(initialReadinessState, { type: "failure" }),
    ).toEqual({
      status: "error",
    });
  });

  it("retries an error through loading and reaches success", () => {
    const error: ReadinessState = readinessReducer(initialReadinessState, {
      type: "failure",
    });
    const loading = readinessReducer(error, { type: "start" });
    expect(loading).toEqual({ status: "loading" });
    expect(
      readinessReducer(loading, { type: "success", value: readiness }),
    ).toEqual({
      status: "ready",
      value: readiness,
    });
  });
});
