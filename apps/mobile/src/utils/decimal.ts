/** Returns true only for a syntactically valid decimal whose value is zero. */
export function isExactDecimalZero(value: string | null | undefined): boolean {
  if (value == null) return false;
  return /^-?0(?:\.0+)?$/.test(value.trim());
}
