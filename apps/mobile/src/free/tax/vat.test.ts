import { describe, expect, it } from "vitest";
import { calculateVat } from "./vat";
const input = { outputBeforeCorrections: 123449n, salesCorrections: 0n, deductibleInput: 100051n, adjustments: 0n, carryForward: 0n };
describe("VAT backend reference parity", () => {
  it("rounds output and input to whole PLN using HALF_UP", () => expect(calculateVat(input).payable).toBe(233n));
  it("combines corrections before rounding and carries forward excess", () => {
    expect(calculateVat({outputBeforeCorrections:10049n,salesCorrections:-50n,deductibleInput:1049n,adjustments:49n,carryForward:2050n})).toEqual({output:9999n,payable:69n,carryForward:0n});
    expect(calculateVat({outputBeforeCorrections:10049n,salesCorrections:0n,deductibleInput:8049n,adjustments:0n,carryForward:3050n}).carryForward).toBe(11n);
  });
  it("rejects a negative opening credit", () => expect(() => calculateVat({...input, carryForward:-1n})).toThrow());
});
