import { readSecureLedger } from "./secureInvoiceLedger";
import { synchronizeKsefMonth } from "./synchronizeKsefMonth";

/** A successful checkpoint, not a nonempty invoice list, determines coverage. */
export function monthsToSynchronize(
  coverage: Readonly<Record<string, string>>,
  currentMonth: string,
): string[] {
  if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(currentMonth) || currentMonth < "2026-01")
    throw new Error("Unsupported synchronization period");
  const [year, month] = currentMonth.split("-").map(Number);
  const months: string[] = [];
  for (let y = 2026; y <= year; y++) {
    for (let m = y === 2026 ? 1 : 1; m <= (y === year ? month : 12); m++) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const previous = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
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
    const ledger = await readSecureLedger(nip);
    const months = monthsToSynchronize(ledger.synchronizedMonths ?? {}, currentMonth);
    for (let index = 0; index < months.length; index++) {
      onProgress?.(index + 1, months.length, months[index]);
      await synchronizeKsefMonth(nip, months[index]);
    }
  } finally { active = false; }
}
