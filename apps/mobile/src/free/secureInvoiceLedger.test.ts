import { describe, expect, it, vi } from "vitest";

// Unit tests provide a storage fake: do not initialize Expo native modules in Node.
vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
import { deleteSecureLedger, readSecureLedger, writeSecureLedger, type SecureLedgerStore } from "./secureInvoiceLedger";
function memoryStore() {
  const values = new Map<string, string>();
  const store: SecureLedgerStore = {
    getItemAsync: vi.fn(async (key) => values.get(key) ?? null),
    setItemAsync: vi.fn(async (key, value) => { values.set(key, value); }),
    deleteItemAsync: vi.fn(async (key) => { values.delete(key); }),
  };
  return { store, values };
}
describe("encrypted KSeF ledger checkpoint", () => {
  it("roundtrips an empty company ledger and deletes it", async () => {
    const { store } = memoryStore();
    await writeSecureLedger({ taxpayerNip: "8133703437", invoices: [] }, store);
    expect((await readSecureLedger("8133703437", store)).invoices).toEqual([]);
    await deleteSecureLedger("8133703437", store);
    expect(await readSecureLedger("8133703437", store)).toEqual({ taxpayerNip: "8133703437", invoices: [] });
  });
  it("rejects corrupt or cross-NIP data", async () => {
    const { store, values } = memoryStore();
    values.set("ryczalt.free.ksef.ledger.v1.8133703437", JSON.stringify({ taxpayerNip: "0000000000", invoices: [] }));
    await expect(readSecureLedger("8133703437", store)).rejects.toThrow("Ledger NIP mismatch");
  });
  it("does not persist oversized ledgers", async () => {
    const { store } = memoryStore();
    await expect(writeSecureLedger({ taxpayerNip: "8133703437", invoices: [{
      source: "ksef", taxpayerNip: "8133703437", ksefId: "a".repeat(2000),
      direction: "issued", kind: "standard", issueDate: "2026-11-20", currency: "PLN",
      grossMinor: "123", netMinor: "100", vatMinor: "23", classification: "unclassified",
    }] }, store)).rejects.toThrow("capacity");
    expect(store.setItemAsync).not.toHaveBeenCalled();
  });
});
