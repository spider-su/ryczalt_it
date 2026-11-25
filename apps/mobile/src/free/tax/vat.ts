/** Pure port of backend VatCalculator; values are signed PLN grosz. The caller must
 * supply classified, correctly dated PLN inputs and an explicit opening balance. */
export type VatInput = { outputBeforeCorrections: bigint; salesCorrections: bigint; deductibleInput: bigint; adjustments: bigint; carryForward: bigint };
export type VatResult = { output: bigint; payable: bigint; carryForward: bigint };
/** BigDecimal setScale(0, HALF_UP), returning PLN as bigint. */
function wholePln(grosz: bigint): bigint {
  const sign = grosz < 0n ? -1n : 1n;
  const absolute = grosz < 0n ? -grosz : grosz;
  return sign * ((absolute + 50n) / 100n);
}
export function calculateVat(input: VatInput): VatResult {
  if (input.carryForward < 0n) throw new Error("Negative VAT opening credit");
  const output = input.outputBeforeCorrections + input.salesCorrections;
  const available = wholePln(input.deductibleInput) + wholePln(input.carryForward);
  const gross = wholePln(output) + wholePln(input.adjustments);
  const difference = gross - available;
  return { output, payable: difference > 0n ? difference : 0n, carryForward: difference < 0n ? -difference : 0n };
}
