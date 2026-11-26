import { beforeEach, describe, expect, it, vi } from "vitest";
const files = new Map<string, string>();
vi.mock("expo-modules-core", () => ({ requireOptionalNativeModule: () => ({
  encryptInvoiceRecord: async (value: string, context: string) => `cipher:${context}:${value.split("").reverse().join("")}`,
  decryptInvoiceRecord: async (value: string, context: string) => {
    const prefix = `cipher:${context}:`;
    if (!value.startsWith(prefix)) throw new Error("Invalid ciphertext");
    return value.slice(prefix.length).split("").reverse().join("");
  },
}) }));
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
import { readSecureLedger, deleteSecureLedger } from "./secureInvoiceLedger";
const nip = "8133703437";
const invoice = (id: string) => ({ source: "ksef" as const, taxpayerNip: nip, ksefId: id,
  direction: "received" as const, kind: "standard" as const, issueDate: "2026-09-16",
  currency: "PLN", grossMinor: "12300", netMinor: "10000", vatMinor: "2300",
  classification: "unclassified" as const });
describe("local JSON invoice persistence", () => {
  beforeEach(() => { files.clear(); vi.clearAllMocks(); });
  it("persists invoices and month completion across restarts", async () => {
    await persistInvoiceLedger({ taxpayerNip: nip, invoices: [invoice("ksef-1")], synchronizedMonths: { "2026-09": "2026-11-26T13:00:00Z" } });
    expect([...files.values()].every(value => value.startsWith("cipher:"))).toBe(true);
    expect([...files.values()].some(value => value.includes("12300"))).toBe(false);
    expect((await readInvoiceLedger(nip)).invoices).toEqual([invoice("ksef-1")]);
    expect((await readInvoiceLedger(nip)).synchronizedMonths?.["2026-09"]).toBe("2026-11-26T13:00:00Z");
  });
  it("does not overwrite immutable invoice content", async () => {
    await persistInvoiceLedger({ taxpayerNip: nip, invoices: [invoice("ksef-1")] });
    await expect(persistInvoiceLedger({ taxpayerNip: nip, invoices: [{ ...invoice("ksef-1"), grossMinor: "1" }] })).rejects.toThrow("Conflicting");
  });
  it("migrates secure records only after encrypted content can be read back", async () => {
    vi.mocked(readSecureLedger).mockResolvedValueOnce({ taxpayerNip: nip, invoices: [invoice("ksef-1")] });
    expect((await readInvoiceLedger(nip)).invoices).toEqual([invoice("ksef-1")]);
    expect(deleteSecureLedger).toHaveBeenCalledWith(nip);
  });
  it("fails closed on plaintext or corrupted records without removing them", async () => {
    const path = `file:///test/RyczaltIT/${nip}/2026/09/invoices/ksef-1.json`;
    files.set(path, JSON.stringify(invoice("ksef-1")));
    await expect(readInvoiceLedger(nip)).rejects.toThrow("Invalid ciphertext");
    expect(files.has(path)).toBe(true);
    expect(deleteSecureLedger).not.toHaveBeenCalled();
  });
  it("supports multiple invoices without a secure-store payload limit", async () => {
    await persistInvoiceLedger({ taxpayerNip: nip, invoices: Array.from({ length: 100 }, (_, i) => invoice("ksef-" + i)) });
    expect((await readInvoiceLedger(nip)).invoices).toHaveLength(100);
    await deleteInvoiceLedger(nip);
    expect((await readInvoiceLedger(nip)).invoices).toHaveLength(0);
  });
});
