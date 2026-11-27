/** Port of backend RyczaltCalculator + RoundingPolicy (Java BigDecimal HALF_UP).
 * All monetary input/output values are signed PLN grosz unless marked *Pln. */
const nonNegative = (n: bigint, field: string) => { if (n < 0n) throw new Error(field + " must not be negative"); return n; };
export function roundWholePln(grosz: bigint): bigint {
  const sign = grosz < 0n ? -1n : 1n;
  const abs = grosz < 0n ? -grosz : grosz;
  return sign * ((abs + 50n) / 100n);
}
export type RyczaltInput = {
  revenueByRate: readonly { rateBasisPoints: number; revenueMinor: bigint }[];
  socialContributionDeduction: bigint;
  healthContributionPaid: bigint;
  deductionsAlreadyConsumed?: bigint;
  deductionCarryForward?: bigint;
  healthDeductionPercent?: number;
};
export type RyczaltResult = {
  revenueMinor: bigint;
  healthDeductionMinor: bigint;
  deductionsAvailableMinor: bigint;
  deductionsUsedMinor: bigint;
  deductionsCarryForwardMinor: bigint;
  taxableBasePln: bigint;
  calculatedTaxPln: bigint;
  taxableByRatePln: readonly { rateBasisPoints: number; taxablePln: bigint; taxPln: bigint }[];
  ruleVersion: string;
};
export function calculateRyczalt(input: RyczaltInput): RyczaltResult {
  const revenue = [...input.revenueByRate].sort((a,b)=>a.rateBasisPoints-b.rateBasisPoints);
  if (!revenue.length || revenue.some(v=>!Number.isInteger(v.rateBasisPoints) || v.rateBasisPoints < 0 || v.rateBasisPoints > 10000))
    throw new Error("Unsupported ryczalt rate");
  for (const row of revenue) nonNegative(row.revenueMinor, "revenue");
  const social = nonNegative(input.socialContributionDeduction, "social");
  const healthPaid = nonNegative(input.healthContributionPaid, "health");
  const consumed = nonNegative(input.deductionsAlreadyConsumed ?? 0n, "consumed");
  const openingCarry = nonNegative(input.deductionCarryForward ?? 0n, "carry");
  const ratio = input.healthDeductionPercent ?? 50;
  if (!Number.isInteger(ratio) || ratio < 0 || ratio > 100) throw new Error("Invalid health deduction ratio");
  const healthDeduction = (healthPaid * BigInt(ratio) + 50n) / 100n;
  const total = revenue.reduce((a,b)=>a+b.revenueMinor,0n);
  const available = social + healthDeduction + openingCarry > consumed
    ? social + healthDeduction + openingCarry - consumed : 0n;
  const used = available < total ? available : total;
  let remainder = used;
  const buckets = revenue.map((item,index) => {
    const allocated = index === revenue.length - 1 ? remainder
      : total === 0n ? 0n : (used * item.revenueMinor * 2n + total) / (2n * total);
    if (index !== revenue.length - 1) remainder -= allocated;
    const taxable = item.revenueMinor > allocated ? item.revenueMinor - allocated : 0n;
    const base = roundWholePln(taxable);
    const tax = (base * BigInt(item.rateBasisPoints) + 5000n) / 10000n;
    return { rateBasisPoints:item.rateBasisPoints, taxablePln:base, taxPln:tax };
  });
  return { revenueMinor:total, healthDeductionMinor:healthDeduction,
    deductionsAvailableMinor:available,deductionsUsedMinor:used,
    deductionsCarryForwardMinor:available-used,
    taxableBasePln:buckets.reduce((a,b)=>a+b.taxablePln,0n),
    calculatedTaxPln:buckets.reduce((a,b)=>a+b.taxPln,0n),
    taxableByRatePln:buckets,ruleVersion:"RYCZALT_2026_POC_V1" };
}
