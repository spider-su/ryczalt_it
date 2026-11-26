import { describe, expect, it, vi } from "vitest";
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///test/" }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
import { applyTaxSettings, settingsForMonth, type TaxSettings } from "./taxSettings";
const version = (month: string, social: string): TaxSettings => ({
  effectiveFrom: month, ryczaltRate: "12", vatPayer: true, settlement: "monthly",
  priorYearRevenueMinor: "10000000", openingVatMinor: "0",
  paidZusSocialMinor: social, paidZusHealthMinor: "0",
});
describe("effective-dated tax settings", () => {
  it("applies the newest version forward without changing prior months", () => {
    const first = applyTaxSettings([], version("2026-01","100"));
    const next = applyTaxSettings(first, version("2026-06","200"));
    expect(settingsForMonth(next,"2026-05")?.paidZusSocialMinor).toBe("100");
    expect(settingsForMonth(next,"2026-06")?.paidZusSocialMinor).toBe("200");
    expect(settingsForMonth(next,"2026-12")?.paidZusSocialMinor).toBe("200");
  });
  it("does not invent settings for months before initial configuration", () => {
    expect(settingsForMonth([version("2026-08","0")],"2026-07")).toBeNull();
  });
  it("rejects incomplete accounting facts", () => {
    expect(() => applyTaxSettings([], {...version("2026-01","0"),openingVatMinor:""})).toThrow();
  });
});
