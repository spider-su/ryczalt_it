import { describe,expect,it } from "vitest";
import { calculateRyczalt } from "./ryczalt";
const input=(revenueMinor:bigint,social=0n,health=0n)=>({
 revenueByRate:[{rateBasisPoints:1200,revenueMinor}],socialContributionDeduction:social,
 healthContributionPaid:health,
});
describe("backend RyczaltCalculator parity (Java RyczaltCalculatorTest)",()=>{
 it("single 12% rate",()=>expect(calculateRyczalt(input(1000000n)).calculatedTaxPln).toBe(1200n));
 it("unused deduction carries forward",()=>{
  const result=calculateRyczalt(input(10000n,15000n));
  expect(result.deductionsCarryForwardMinor).toBe(5000n);
  expect(result.calculatedTaxPln).toBe(0n);
 });
 it("deducts 50% paid health",()=>{
  const result=calculateRyczalt(input(100000n,0n,10000n));
  expect(result.healthDeductionMinor).toBe(5000n);
  expect(result.taxableBasePln).toBe(950n);
  expect(result.calculatedTaxPln).toBe(114n);
 });
 it("matches January backend reference",()=>{
  const result=calculateRyczalt(input(6177123n,0n,138498n));
  expect(result.healthDeductionMinor).toBe(69249n);
  expect(result.taxableBasePln).toBe(61079n);
  expect(result.calculatedTaxPln).toBe(7329n);
 });
 it("rounds taxable base before tax at 12.50 PLN",()=>{
  expect(calculateRyczalt(input(1250n)).calculatedTaxPln).toBe(2n);
 });
 it("matches proportional allocation independent of input order",()=>{
  const revenueByRate=[{rateBasisPoints:1200,revenueMinor:20000n},{rateBasisPoints:300,revenueMinor:10000n}];
  const a=calculateRyczalt({revenueByRate,socialContributionDeduction:1000n,healthContributionPaid:0n});
  const b=calculateRyczalt({revenueByRate:[...revenueByRate].reverse(),socialContributionDeduction:1000n,healthContributionPaid:0n});
  expect(a.taxableByRatePln).toEqual(b.taxableByRatePln);
  expect(a.calculatedTaxPln).toBe(26n);
 });
});
