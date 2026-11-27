import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ list: vi.fn(), download: vi.fn(), write: vi.fn(), company: vi.fn(), credential: vi.fn(), auth: vi.fn(), read: vi.fn(), parse: vi.fn() }));
vi.mock("./ksefAuth", () => ({ KsefAuthClient: class { authenticate = mocks.auth; } }));
vi.mock("./ksefNativeEncryption", () => ({ KsefAndroidEncryptor: class {} }));
vi.mock("./ksefCredentials", () => ({ getKsefTokenForAuthentication: mocks.credential }));
vi.mock("./ksefInvoiceReader", () => ({ KsefInvoiceReader: class { list = mocks.list; downloadXml = mocks.download; } }));
vi.mock("./parseMinimalFa3", () => ({ parseMinimalFa3: mocks.parse }));
vi.mock("./jsonInvoiceLedger", () => ({ readInvoiceLedger: mocks.read, persistInvoiceLedger: mocks.write }));
vi.mock("./localCompany", () => ({ loadCompany: mocks.company }));
import { synchronizeKsefMonth } from "./synchronizeKsefMonth";
const nip = "8133703437";
const ledger = { taxpayerNip: nip, invoices: [] };
beforeEach(() => { vi.resetAllMocks(); mocks.credential.mockResolvedValue("token"); mocks.auth.mockResolvedValue({accessToken:"access"}); mocks.read.mockResolvedValue(ledger); mocks.company.mockResolvedValue({nip}); mocks.list.mockResolvedValue({invoices:[],hasMore:false}); mocks.write.mockResolvedValue(undefined); });
describe("KSeF synchronization commit", () => {
  it("commits only the selected month's coverage after both roles succeed", async () => {
    const result = await synchronizeKsefMonth(nip, "2026-11");
    expect(mocks.list).toHaveBeenCalledTimes(2);
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(result.synchronizedMonths?.["2026-11"]).toBeTruthy();
    expect(result.synchronizedMonths?.["2026-10"]).toBeUndefined();
  });
  it("never writes coverage when the second role fails", async () => {
    mocks.list.mockResolvedValueOnce({invoices:[],hasMore:false}).mockRejectedValueOnce(new Error("denied"));
    await expect(synchronizeKsefMonth(nip, "2026-11")).rejects.toThrow();
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("keeps successfully downloaded invoices but does not mark a month complete after a malformed invoice", async () => {
    const good = { ksefNumber: "1234567890-20260901-AAA" };
    const bad = { ksefNumber: "1234567890-20260901-BBB" };
    mocks.list.mockResolvedValueOnce({invoices:[good,bad],hasMore:false}).mockResolvedValueOnce({invoices:[],hasMore:false});
    mocks.download.mockResolvedValue("<xml/>");
    mocks.parse.mockReturnValueOnce({ksefId:good.ksefNumber,taxpayerNip:nip,direction:"issued",kind:"standard",issueDate:"2026-09-01",currency:"PLN",grossMinor:"12300",netMinor:"10000",vatMinor:"2300",classification:"unclassified",source:"ksef"})
      .mockImplementationOnce(() => { throw new Error("Unsupported invoice type"); });
    await expect(synchronizeKsefMonth(nip,"2026-09")).rejects.toThrow(bad.ksefNumber);
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(mocks.write.mock.calls[0]?.[0].invoices).toHaveLength(1);
    expect(mocks.write.mock.calls[0]?.[0].synchronizedMonths?.["2026-09"]).toBeUndefined();
  });
  it("does not write after a company change", async () => {
    mocks.company.mockResolvedValue({nip:"0000000000"});
    await expect(synchronizeKsefMonth(nip, "2026-11")).rejects.toThrow("company changed");
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
