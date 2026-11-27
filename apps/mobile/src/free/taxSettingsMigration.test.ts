import { beforeEach, describe, expect, it, vi } from "vitest";

const files = vi.hoisted(() => new Map<string, string>());
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///test/",
  getInfoAsync: vi.fn(async (path: string) => ({ exists: path.endsWith("/settings/") || files.has(path) })),
  readDirectoryAsync: vi.fn(async (folder: string) =>
    [...files.keys()].filter(path => path.startsWith(folder)).map(path => path.slice(folder.length))),
  readAsStringAsync: vi.fn(async (path: string) => files.get(path) ?? ""),
  writeAsStringAsync: vi.fn(async (path: string, value: string) => { files.set(path, value); }),
  moveAsync: vi.fn(async ({ from, to }: { from: string; to: string }) => {
    const value = files.get(from);
    if (value === undefined) throw new Error("Missing temporary settings");
    files.set(to, value);
    files.delete(from);
  }),
  deleteAsync: vi.fn(async (path: string) => { files.delete(path); }),
  makeDirectoryAsync: vi.fn(async () => undefined),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
import { loadTaxSettings, settingsForMonth, type TaxSettings } from "./taxSettings";
const root = "file:///test/RyczaltIT/8133703437/settings/";
const settings = (month: string, revenue: string): TaxSettings => ({
  effectiveFrom: month, ryczaltRate: "12", vatPayer: true, settlement: "monthly",
  priorYearRevenueMinor: revenue, openingVatMinor: "2500",
  paidZusSocialMinor: "10000", paidZusHealthMinor: "5000",
});
beforeEach(() => files.clear());
describe("first-time settings backfill", () => {
  it("migrates a November-only configuration to January for historical invoices", async () => {
    files.set(root + "2026-11.json", JSON.stringify(settings("2026-11", "10000000")));
    const history = await loadTaxSettings("8133703437");
    expect(history.map(item => item.effectiveFrom)).toEqual(["2026-01", "2026-11"]);
    expect(settingsForMonth(history, "2026-08")?.priorYearRevenueMinor).toBe("10000000");
    expect(settingsForMonth(history, "2026-08")?.openingVatMinor).toBe("0");
    expect(settingsForMonth(history, "2026-11")?.openingVatMinor).toBe("2500");
    expect(files.has(root + "2026-01.json")).toBe(true);
    expect((await loadTaxSettings("8133703437")).length).toBe(2);
  });
  it("keeps later effective-dated changes intact", async () => {
    files.set(root + "2026-03.json", JSON.stringify(settings("2026-03", "10000000")));
    files.set(root + "2026-11.json", JSON.stringify(settings("2026-11", "20000000")));
    const history = await loadTaxSettings("8133703437");
    expect(settingsForMonth(history, "2026-01")?.priorYearRevenueMinor).toBe("10000000");
    expect(settingsForMonth(history, "2026-10")?.priorYearRevenueMinor).toBe("10000000");
    expect(settingsForMonth(history, "2026-11")?.priorYearRevenueMinor).toBe("20000000");
  });
});
