import { describe, expect, it, vi } from "vitest";
vi.mock("./jsonInvoiceLedger", () => ({ readInvoiceLedger: vi.fn() }));
vi.mock("./synchronizeKsefMonth", () => ({ synchronizeKsefMonth: vi.fn() }));
import { monthsToSynchronize, synchronizeKsefHistory } from "./synchronizeKsefHistory";
import { readInvoiceLedger } from "./jsonInvoiceLedger";
import { synchronizeKsefMonth } from "./synchronizeKsefMonth";
describe("global KSeF synchronization coverage", () => {
  it("continues after one month fails, and reports incomplete history", async () => {
    vi.mocked(readInvoiceLedger).mockResolvedValue({taxpayerNip:"8133703437",invoices:[]});
    vi.mocked(synchronizeKsefMonth).mockReset();
    vi.mocked(synchronizeKsefMonth).mockRejectedValueOnce(new Error("Unsupported invoice type"))
      .mockResolvedValue({taxpayerNip:"8133703437",invoices:[]});
    await expect(synchronizeKsefHistory("8133703437")).rejects.toThrow("Unsupported invoice type");
    expect(vi.mocked(synchronizeKsefMonth).mock.calls.length).toBeGreaterThan(1);
  });
  it("initially covers every month since January 2026", () => {
    expect(monthsToSynchronize({}, "2026-04")).toEqual(["2026-01","2026-02","2026-03","2026-04"]);
  });
  it("refreshes current and previous month while retrying uncovered history", () => {
    expect(monthsToSynchronize({"2026-01":"2026-02-01T10:00:00Z","2026-03":"2026-04-01T10:00:00Z"}, "2026-04")).toEqual(["2026-02","2026-03","2026-04"]);
  });
  it("never considers a month covered based only on invoice count", () => {
    expect(monthsToSynchronize({"2026-01":"2026-02-01T10:00:00Z"}, "2026-02")).toEqual(["2026-01","2026-02"]);
  });
});
