export type VatCompany = {
  nip: string;
  name: string;
  regon: string | null;
  statusVat: string | null;
  residenceAddress: string | null;
  workingAddress: string | null;
  retrievedAt: string;
  requestId: string | null;
};

/** Polish NIP control digit: weights 6,5,7,2,3,4,5,6,7. */
export function validNip(input: string): boolean {
  const nip = input.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(nip)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((value, weight, index) => value + weight * Number(nip[index]), 0);
  return sum % 11 === Number(nip[9]);
}

type VatRegistryResponse = {
  result?: {
    subject?: {
      name?: string | null;
      nip?: string | null;
      regon?: string | null;
      statusVat?: string | null;
      residenceAddress?: string | null;
      workingAddress?: string | null;
    } | null;
    requestId?: string | null;
  };
};

/** Calls the official MF VAT taxpayer registry; does not use our backend. */
export async function lookupCompanyByNip(
  input: string,
  at: Date = new Date(),
  request: typeof fetch = fetch,
): Promise<VatCompany> {
  const nip = input.replace(/[\s-]/g, "");
  if (!validNip(nip)) throw new Error("Nieprawidłowy NIP.");
  // Use a local calendar date, as required by the MF VAT register.
  const date = [at.getFullYear(), String(at.getMonth() + 1).padStart(2, "0"), String(at.getDate()).padStart(2, "0")].join("-");
  const url = `https://wykazpodatnikowvat.mf.gov.pl/api/search/nip/${nip}?date=${date}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await request(url, { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal });
  } catch {
    throw new Error("Nie można połączyć się z rejestrem VAT. Spróbuj ponownie.");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Rejestr VAT jest niedostępny (HTTP ${response.status}).`);
  let payload: VatRegistryResponse;
  try {
    payload = await response.json() as VatRegistryResponse;
  } catch {
    throw new Error("Rejestr VAT zwrócił nieprawidłową odpowiedź.");
  }
  const subject = payload.result?.subject;
  if (!subject?.name || (subject.nip && subject.nip !== nip))
    throw new Error("Nie znaleziono potwierdzonych danych firmy dla podanego NIP.");
  return {
    nip,
    name: subject.name,
    regon: subject.regon ?? null,
    statusVat: subject.statusVat ?? null,
    residenceAddress: subject.residenceAddress ?? null,
    workingAddress: subject.workingAddress ?? null,
    retrievedAt: at.toISOString(),
    requestId: payload.result?.requestId ?? null,
  };
}
