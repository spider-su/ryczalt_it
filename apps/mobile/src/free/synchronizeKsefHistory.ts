import { readInvoiceLedger } from "./jsonInvoiceLedger";
import { synchronizeKsefMonth } from "./synchronizeKsefMonth";

/** A successful checkpoint, not a nonempty invoice list, determines coverage. */
export function monthsToSynchronize(
  coverage: Readonly<Record<string, string>>,
  currentMonth: string,
): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(currentMonth) || currentMonth < "2026-01")
    throw new Error("Unsupported synchronization period");
  const year = Number(currentMonth.slice(0, 4));
  const month = Number(currentMonth.slice(5, 7));
  const previous = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
  const months: string[] = [];
  for (let y = 2026; y <= year; y++) {
    for (let m = 1; m <= (y === year ? month : 12); m++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      if (!coverage[key] || key === currentMonth || key === previous) months.push(key);
    }
  }
  return months;
}

let active = false;
export async function synchronizeKsefHistory(
  nip: string,
  onProgress?: (current: number, total: number, month: string) => void,
): Promise<void> {
  if (active) throw new Error("Synchronization already in progress");
  active = true;
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const ledger = await readInvoiceLedger(nip);
    const months = monthsToSynchronize(ledger.synchronizedMonths ?? {}, currentMonth);
    const failures: string[] = [];
    for (let index = 0; index < months.length; index++) {
      const target = months[index];
      if (!target) throw new Error("Missing synchronization period");
      onProgress?.(index + 1, months.length, target);
      try { await synchronizeKsefMonth(nip, target); }
      catch (reason) { failures.push(`${target}: ${reason instanceof Error ? reason.message : String(reason)}`); }
    }
    if (failures.length) throw new Error(`Nie ukończono ${failures.length} miesięcy. ${failures.slice(0, 3).join(" | ")}`);
  } finally { active = false; }
}
