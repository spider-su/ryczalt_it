import { beforeEach, describe, expect, it, vi } from "vitest";
const files = new Map<string, string>();
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("./secureInvoiceLedger", () => ({
  readSecureLedger: vi.fn(async (nip: string) => ({ taxpayerNip: nip, invoices: [] })),
  deleteSecureLedger: vi.fn(async () => {}),
}));
vi.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///test/",
  makeDirectoryAsync: vi.fn(async () => {}),
  getInfoAsync: vi.fn(async (path: string) => ({ exists: files.has(path) || [...files.keys()].some(k => k.startsWith(path)) })),
  readAsStringAsync: vi.fn(async (path: string) => { if (!files.has(path)) throw Error("missing"); return files.get(path)!; }),
  writeAsStringAsync: vi.fn(async (path: string, value: string) => { files.set(path, value); }),
  moveAsync: vi.fn(async ({ from, to }: { from: string; to: string }) => { files.set(to, files.get(from)!); files.delete(from); }),
  deleteAsync: vi.fn(async (path: string) => { for (const key of files.keys()) if (key.startsWith(path)) files.delete(key); }),
  readDirectoryAsync: vi.fn(async (path: string) => [...new Set([...files.keys()].filter(k => k.startsWith(path)).map(k => k.slice(path.length).split("/")[0]))]),
}));
import { deleteInvoiceLedger, persistInvoiceLedger, readInvoiceLedger } from "./jsonInvoiceLedger";
const nip = "8133703437";
const invoice = (id: string) => ({ source: "ksef" as const, taxpayerNip: nip, ksefId: id,
  direction: "received" as const, kind: "standard" as const, issueDate: "2026-09-16",
  currency: "PLN", grossMinor: "12300", netMinor: "10000", vatMinor: "2300",
  classification: "unclassified" as const });
describe("local JSON invoice persistence", () => {
  beforeEach(() => files.clear());
  it("persists invoices and month completion across restarts", async () => {
    await persistInvoiceLedger({ taxpayerNip: nip, invoices: [invoice("ksef-1")], synchronizedMonths: { "2026-09": "2026-11-26T13:00:00Z" } });
    expect((await readInvoiceLedger(nip)).invoices).toEqual([invoice("ksef-1")]);
    expect((await readInvoiceLedger(nip)).synchronizedMonths?.["2026-09"]).toBe("2026-11-26T13:00:00Z");
  });
  it("does not overwrite immutable invoice content", async () => {
    await persistInvoiceLedger({ taxpayerNip: nip, invoices: [invoice("ksef-1")] });
    await expect(persistInvoiceLedger({ taxpayerNip: nip, invoices: [{ ...invoice("ksef-1"), grossMinor: "1" }] })).rejects.toThrow("Conflicting");
  });
  it("supports multiple invoices without a secure-store payload limit", async () => {
    await persistInvoiceLedger({ taxpayerNip: nip, invoices: Array.from({ length: 100 }, (_, i) => invoice("ksef-" + i)) });
    expect((await readInvoiceLedger(nip)).invoices).toHaveLength(100);
    await deleteInvoiceLedger(nip);
    expect((await readInvoiceLedger(nip)).invoices).toHaveLength(0);
  });
});
