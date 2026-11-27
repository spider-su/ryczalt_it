import { describe,expect,it } from "vitest";
import { calculateZus,healthBand } from "./zus";
const base={jdgActive:true,qualifyingUop:false,zusRegime:"JDG" as const,voluntarySickness:false,ytdRyczaltRevenueMinor:6000001n};
describe("backend ZusCalculator parity (Java ZusCalculatorTest)",()=>{
 it("medium-band primary JDG social and health",()=>{
  const z=calculateZus({...base,socialContributionPaidMinor:164982n,healthContributionPaidMinor:83058n});
  expect([z.socialMinor,z.healthMinor,z.totalMinor,z.deductibleSocialMinor,z.healthBand])
   .toEqual([178829n,83058n,261887n,164982n,"MEDIUM"]);
 });
 it("qualifying UoP has only health contribution",()=>{
  const z=calculateZus({...base,qualifyingUop:true,ytdRyczaltRevenueMinor:0n});
  expect([z.socialMinor,z.healthMinor,z.totalMinor]).toEqual([0n,49835n,49835n]);
 });
 it("voluntary sickness adds a social contribution",()=>{
  const z=calculateZus({...base,ytdRyczaltRevenueMinor:0n,voluntarySickness:true});
  expect(z.socialMinor).toBe(192676n);
  expect(z.deductibleSocialMinor).toBe(178829n);
 });
 it("paid zero remains zero for PIT deductions",()=>{
  const z=calculateZus({...base,healthContributionPaidMinor:0n,socialContributionPaidMinor:0n});
  expect(z.healthPaidForDeductionMinor).toBe(0n);
  expect(z.deductibleSocialMinor).toBe(0n);
 });
 it("keeps obligation separate from paid health",()=>{
  const z=calculateZus({...base,explicitHealthBand:"HIGH",healthContributionOverrideMinor:149504n,healthContributionPaidMinor:138498n});
  expect(z.healthMinor).toBe(149504n);
  expect(z.healthPaidForDeductionMinor).toBe(138498n);
 });
 it("enforces inclusive health thresholds",()=>{
  expect(healthBand(6000000n)).toBe("LOW");
  expect(healthBand(6000001n)).toBe("MEDIUM");
  expect(healthBand(30000000n)).toBe("MEDIUM");
  expect(healthBand(30000001n)).toBe("HIGH");
 });
 it("rejects voluntary sickness for UoP",()=>expect(()=>calculateZus({...base,qualifyingUop:true,voluntarySickness:true})).toThrow());
});
