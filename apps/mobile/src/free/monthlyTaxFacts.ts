import * as FS from "expo-file-system/legacy";
import { Platform } from "react-native";

export type MonthlyTaxFacts = {
  month: string;
  openingVatMinor: string;
  paidZusSocialMinor: string;
  paidZusHealthMinor: string;
};
const MONTH = /^\\d{4}-(0[1-9]|1[0-2])$/;
const AMOUNT = /^\\d+$/;
function path(nip: string, month: string): string {
  if (!/^\\d{10}$/.test(nip) || !MONTH.test(month) || month < "2026-01")
    throw new Error("Invalid tax facts period");
  if (Platform.OS === "web" || !FS.documentDirectory) throw new Error("Native storage required");
  return FS.documentDirectory + "RyczaltIT/" + nip + "/" + month.slice(0,4) + "/" + month.slice(5) + "/taxes.json";
}
function validate(value: MonthlyTaxFacts, month: string): void {
  if (value.month !== month || !AMOUNT.test(value.openingVatMinor) ||
      !AMOUNT.test(value.paidZusSocialMinor) || !AMOUNT.test(value.paidZusHealthMinor))
    throw new Error("Invalid monthly accounting facts");
}
/** Month-specific evidence: no implicit inheritance from previous periods. */
export async function loadMonthlyTaxFacts(nip: string, month: string): Promise<MonthlyTaxFacts | null> {
  const target = path(nip, month);
  if (!(await FS.getInfoAsync(target)).exists) return null;
  const facts = JSON.parse(await FS.readAsStringAsync(target)) as MonthlyTaxFacts;
  validate(facts, month);
  return facts;
}
export async function saveMonthlyTaxFacts(nip: string, facts: MonthlyTaxFacts): Promise<void> {
  validate(facts, facts.month);
  const target = path(nip, facts.month);
  const folder = target.slice(0, target.lastIndexOf("/") + 1);
  await FS.makeDirectoryAsync(folder, { intermediates: true });
  // This is an explicit user revision of one month, not an automatic carry-forward.
  await FS.writeAsStringAsync(target, JSON.stringify(facts));
}
