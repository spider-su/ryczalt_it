import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { ApiAccountingRepository } from "./apiAccountingRepository";

describe("ApiAccountingRepository missing month handling", () => {
  it("returns an empty month for the backend's period-not-found response", async () => {
    const api = {
      getPeriod: vi.fn(async () => {
        throw new ApiError(
          "Ryczalt period does not exist for profile 1: 2026-10",
          404,
          undefined,
          "not-found",
        );
      }),
      getInvoices: vi.fn(async () => {
        throw new Error("dependent period is absent");
      }),
      getTransactions: vi.fn(async () => {
        throw new Error("dependent period is absent");
      }),
      getObligations: vi.fn(async () => {
        throw new Error("dependent period is absent");
      }),
      getIssues: vi.fn(async () => {
        throw new Error("dependent period is absent");
      }),
    };

    const parts = await new ApiAccountingRepository(
      api as never,
      1,
    ).getMonthParts("2026-10");

    expect(parts).toMatchObject({
      period: null,
      invoices: [],
      transactions: [],
      obligations: [],
      issues: [],
      failures: {},
      missingPeriod: true,
    });
  });

  it.each([
    "The requested API resource was not found",
    "Ryczalt period does not exist for profile 2: 2026-10",
    "Ryczalt period does not exist for profile 1: 2026-09",
  ])("keeps an unrelated 404 as an error: %s", async (message) => {
    const missingRoute = new ApiError(
      message,
      404,
      undefined,
      "not-found",
    );
    const api = {
      getPeriod: vi.fn(async () => {
        throw missingRoute;
      }),
      getInvoices: vi.fn(async () => []),
      getTransactions: vi.fn(async () => []),
      getObligations: vi.fn(async () => []),
      getIssues: vi.fn(async () => []),
    };

    const parts = await new ApiAccountingRepository(
      api as never,
      1,
    ).getMonthParts("2026-10");

    expect(parts.missingPeriod).toBeUndefined();
    expect(parts.failures.period).toBe(missingRoute);
  });
});
