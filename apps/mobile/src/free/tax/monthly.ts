/** Pure equivalent of NativeMonthCalculationService's calculate stage.
 * Inputs must already be approved/classified PLN accounting facts. No KSeF guesses here. */
import { calculateRyczalt, type RyczaltResult } from "./ryczalt";
import { calculateVat, type VatInput, type VatResult } from "./vat";
import { calculateZus, type ZusInput, type ZusResult, type ZusRules, ZUS_2026 } from "./zus";
export type NativeMonthInput = {
 revenueByRate: readonly {rateBasisPoints:number;revenueMinor:bigint}[];
 vat:VatInput;
 zus:ZusInput;
 deductionsAlreadyConsumed?:bigint;
 deductionCarryForward?:bigint;
};
export type NativeMonthResult = {
 pit: RyczaltResult;vat:VatResult;zus:ZusResult;
 pitPayablePln:bigint;vatPayablePln:bigint;zusPayableMinor:bigint;
};
export function calculateNativeMonth(input:NativeMonthInput,zusRules:ZusRules=ZUS_2026):NativeMonthResult {
 const zus=calculateZus(input.zus,zusRules);
 const pit=calculateRyczalt({
  revenueByRate:input.revenueByRate,
  socialContributionDeduction:zus.deductibleSocialMinor,
  healthContributionPaid:zus.healthPaidForDeductionMinor,
  deductionsAlreadyConsumed:input.deductionsAlreadyConsumed??0n,
  deductionCarryForward:input.deductionCarryForward??0n,
 });
 const vat=calculateVat(input.vat);
 return {pit,vat,zus,pitPayablePln:pit.calculatedTaxPln,vatPayablePln:vat.payable,zusPayableMinor:zus.totalMinor};
}
