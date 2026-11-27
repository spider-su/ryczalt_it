import { describe, expect, it, vi } from "vitest";
const files = new Map<string,string>();
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///test/",
  getInfoAsync: vi.fn(async (path: string) => ({ exists: files.has(path) })),
  readAsStringAsync: vi.fn(async (path: string) => files.get(path) ?? ""),
  writeAsStringAsync: vi.fn(async (path: string, value: string) => { files.set(path,value); }),
  makeDirectoryAsync: vi.fn(async () => undefined),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
import { loadMonthlyTaxFacts, saveMonthlyTaxFacts } from "./monthlyTaxFacts";
describe("month-specific accounting facts", () => {
  it("accepts a real NIP and month and persists amounts in taxes.json", async () => {
    const facts = { month: "2026-11", openingVatMinor: "0", paidZusSocialMinor: "10000", paidZusHealthMinor: "5000" };
    await saveMonthlyTaxFacts("8133703437", facts);
    expect(await loadMonthlyTaxFacts("8133703437", "2026-11")).toEqual(facts);
    expect(await loadMonthlyTaxFacts("8133703437", "2026-10")).toBeNull();
  });
  it("rejects periods before January 2026", async () => {
    await expect(loadMonthlyTaxFacts("8133703437", "2025-12")).rejects.toThrow("Invalid tax facts period");
  });
});
