import { describe, expect, it } from "vitest";
import { parseMinimalFa3 } from "./parseMinimalFa3";
const body = `<Faktura xmlns="http://crd.gov.pl/wzor/example/fa3"><Podmiot1><NIP>1111111111</NIP></Podmiot1><Podmiot2><NIP>2222222222</NIP></Podmiot2><Fa><KodWaluty>PLN</KodWaluty><RodzajFaktury>VAT</RodzajFaktury><P_1>2026-08-29</P_1><P_13_1>100.00</P_13_1><P_14_1>23.00</P_14_1><P_13_2>50.00</P_13_2><P_14_2>4.00</P_14_2><P_15>177.00</P_15></Fa></Faktura>`;
describe("FA3 invoice parser", () => {
  it("parses backend multi-rate fixture with integer precision", () => {
    expect(parseMinimalFa3(body, "id", "1111111111", "issued")).toMatchObject({netMinor: "15000", vatMinor: "2700", grossMinor: "17700"});
  });
  it("rejects unrelated company, malformed XML and external entities", () => {
    expect(() => parseMinimalFa3(body, "id", "3333333333", "issued")).toThrow();
    expect(() => parseMinimalFa3('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///x">]><Faktura>&x;</Faktura>', "id", "1111111111", "issued")).toThrow();
    expect(() => parseMinimalFa3(body.replace('</Faktura>', ''), "id", "1111111111", "issued")).toThrow();
  });
  it("rejects unsupported types instead of marking them standard", () => {
    expect(() => parseMinimalFa3(body.replace('<RodzajFaktury>VAT', '<RodzajFaktury>UNKNOWN'), "id", "1111111111", "issued")).toThrow();
  });
});
