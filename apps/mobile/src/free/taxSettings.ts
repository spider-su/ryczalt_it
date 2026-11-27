import * as FS from "expo-file-system/legacy";
import { Platform } from "react-native";

export type TaxSettings = {
  effectiveFrom: string;
  ryczaltRate: "12";
  vatPayer: true;
  settlement: "monthly";
  priorYearRevenueMinor: string;
  openingVatMinor: string;
  paidZusSocialMinor: string;
  paidZusHealthMinor: string;
};
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const AMOUNT = /^\d+$/;
function base(nip: string): string {
  if (!/^\d{10}$/.test(nip)) throw new Error("Invalid NIP");
  if (Platform.OS === "web" || !FS.documentDirectory) throw new Error("Native storage required");
  return FS.documentDirectory + "RyczaltIT/" + nip + "/settings/";
}
export function validateTaxSettings(settings: TaxSettings): void {
  if (!MONTH.test(settings.effectiveFrom) || settings.effectiveFrom < "2026-01")
    throw new Error("Nieprawidłowy miesiąc obowiązywania");
  if (settings.ryczaltRate !== "12" || settings.vatPayer !== true || settings.settlement !== "monthly")
    throw new Error("Nieobsługiwany sposób rozliczenia");
  for (const key of ["priorYearRevenueMinor", "openingVatMinor", "paidZusSocialMinor", "paidZusHealthMinor"] as const) {
    if (!AMOUNT.test(settings[key])) throw new Error("Nieprawidłowa kwota: " + key);
  }
}
export function settingsForMonth(history: readonly TaxSettings[], month: string): TaxSettings | null {
  if (!MONTH.test(month)) throw new Error("Invalid month");
  return [...history].filter(s => s.effectiveFrom <= month)
    .sort((a,b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null;
}
export function applyTaxSettings(history: readonly TaxSettings[], settings: TaxSettings): TaxSettings[] {
  validateTaxSettings(settings);
  // A new effective date changes that month and later, but never retroactively rewrites earlier versions.
  return [...history.filter(s => s.effectiveFrom !== settings.effectiveFrom), settings]
    .sort((a,b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}
export async function loadTaxSettings(nip: string): Promise<TaxSettings[]> {
  const folder = base(nip);
  if (!(await FS.getInfoAsync(folder)).exists) return [];
  const files = await FS.readDirectoryAsync(folder);
  const versions: TaxSettings[] = [];
  for (const file of files) {
    if (!/^\d{4}-(0[1-9]|1[0-2])\.json$/.test(file)) continue;
    const value = JSON.parse(await FS.readAsStringAsync(folder + file)) as TaxSettings;
    validateTaxSettings(value);
    if (file !== value.effectiveFrom + ".json") throw new Error("Settings file mismatch");
    versions.push(value);
  }
  versions.sort((a,b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  // Initial setup was previously saved with the current month as its effective date.
  // Our accounting history starts in January 2026: backfill only the earliest version,
  // preserving every subsequent version and its forward-only effective date.
  const first = versions[0];
  if (first && first.effectiveFrom > "2026-01") {
    const baseline: TaxSettings = { ...first, effectiveFrom: "2026-01",
      openingVatMinor: "0", paidZusSocialMinor: "0", paidZusHealthMinor: "0" };
    await saveTaxSettings(nip, baseline);
    versions.unshift(baseline);
  }
  return versions;
}
export async function saveTaxSettings(nip: string, settings: TaxSettings): Promise<void> {
  validateTaxSettings(settings);
  const folder = base(nip);
  await FS.makeDirectoryAsync(folder, { intermediates: true });
  const target = folder + settings.effectiveFrom + ".json";
  const temp = target + ".tmp";
  await FS.writeAsStringAsync(temp, JSON.stringify(settings));
  try { await FS.moveAsync({ from: temp, to: target }); }
  catch (error) { await FS.deleteAsync(temp, { idempotent: true }); throw error; }
}

/** Period-specific payments and opening credits must never be inherited from an earlier month.
 * Effective-dated configuration may carry forward; accounting evidence cannot. */
export function accountingFactsForMonth(history: readonly TaxSettings[], month: string): Pick<TaxSettings,
  "openingVatMinor" | "paidZusSocialMinor" | "paidZusHealthMinor"> | null {
  if (!MONTH.test(month)) throw new Error("Invalid month");
  const exact = history.find(s => s.effectiveFrom === month);
  return exact ? {
    openingVatMinor: exact.openingVatMinor,
    paidZusSocialMinor: exact.paidZusSocialMinor,
    paidZusHealthMinor: exact.paidZusHealthMinor,
  } : null;
}
