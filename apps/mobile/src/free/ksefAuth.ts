/**
 * KSeF v2 authorization protocol.
 *
 * Deliberately independent of mobile storage and UI. A native, audited RSA-OAEP
 * SHA-256 encryption provider MUST be injected before this can be called from UI.
 * Tokens are never logged, persisted by this module, or placed in URLs.
 */
export type KsefEnvironment = "production" | "demo" | "test";
const HOSTS: Record<KsefEnvironment, string> = {
  production: "https://api.ksef.mf.gov.pl",
  demo: "https://api-demo.ksef.mf.gov.pl",
  test: "https://api-test.ksef.mf.gov.pl",
};

export interface KsefRsaEncryptor {
  /** Encrypt UTF-8 token|timestampMs with current KSeF public RSA key, RSA-OAEP SHA-256; return Base64 ciphertext. */
  encryptTokenWithKsefPublicKey(plaintext: string, environment: KsefEnvironment): Promise<string>;
}
export interface KsefAuthResult {
  accessToken: string;
  refreshToken: string;
}
type TokenContainer = { token?: unknown };
type Challenge = { challenge?: unknown; timestamp?: unknown };
type AuthInitiation = { referenceNumber?: unknown; authenticationToken?: TokenContainer };
type AuthStatus = { status?: { code?: unknown; description?: unknown } };
type Redeemed = { accessToken?: TokenContainer; refreshToken?: TokenContainer };

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Nieprawidłowa odpowiedź KSeF.");
  return value;
}
function requireNip(nip: string): void {
  if (!/^\d{10}$/.test(nip)) throw new Error("Nieprawidłowy kontekst NIP.");
}
export class KsefAuthError extends Error {
  constructor(readonly kind: "network" | "denied" | "pending" | "protocol") {
    super(kind === "network" ? "Nie można połączyć się z KSeF."
      : kind === "denied" ? "KSeF odrzucił uwierzytelnienie."
      : kind === "pending" ? "Uwierzytelnienie KSeF nie zostało zakończone."
      : "Nieprawidłowa odpowiedź KSeF.");
    this.name = "KsefAuthError";
  }
}

export class KsefAuthClient {
  constructor(
    readonly environment: KsefEnvironment,
    private readonly encryptor: KsefRsaEncryptor,
    private readonly transport: typeof fetch = fetch,
    private readonly delay: (milliseconds: number) => Promise<void> =
      (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}
  private async json<T>(path: string, method: "GET" | "POST", payload?: unknown, bearer?: string): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (payload !== undefined) headers["Content-Type"] = "application/json";
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    let response: Response;
    try {
      response = await this.transport(HOSTS[this.environment] + path, {
        method, headers, body: payload === undefined ? undefined : JSON.stringify(payload),
      });
    } catch {
      throw new KsefAuthError("network");
    }
    if (!response.ok) throw new KsefAuthError(response.status === 401 || response.status === 403 ? "denied" : "network");
    try { return await response.json() as T; }
    catch { throw new KsefAuthError("protocol"); }
  }

  async authenticate(nip: string, systemToken: string): Promise<KsefAuthResult> {
    requireNip(nip);
    if (!systemToken.trim()) throw new KsefAuthError("denied");
    const challenge = await this.json<Challenge>("/v2/auth/challenge", "POST");
    const challengeId = requiredString(challenge.challenge);
    const timestampMs = Date.parse(requiredString(challenge.timestamp));
    if (!Number.isFinite(timestampMs)) throw new KsefAuthError("protocol");
    const encryptedToken = await this.encryptor.encryptTokenWithKsefPublicKey(
      `${systemToken}|${timestampMs}`, this.environment,
    );
    if (!encryptedToken || !/^[A-Za-z0-9+/]+={0,2}$/.test(encryptedToken)) throw new KsefAuthError("protocol");
    const started = await this.json<AuthInitiation>("/v2/auth/ksef-token", "POST", {
      challenge: challengeId,
      contextIdentifier: { type: "Nip", value: nip },
      encryptedToken,
    });
    const ref = requiredString(started.referenceNumber);
    const temporary = requiredString(started.authenticationToken?.token);
    // The result is asynchronous. Poll with bounded attempts; do not redeem early.
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const status = await this.json<AuthStatus>(
        `/v2/auth/${encodeURIComponent(ref)}`, "GET", undefined, temporary,
      );
      const code = status.status?.code;
      if (code === 200) {
        const redeemed = await this.json<Redeemed>("/v2/auth/token/redeem", "POST", undefined, temporary);
        return {
          accessToken: requiredString(redeemed.accessToken?.token),
          refreshToken: requiredString(redeemed.refreshToken?.token),
        };
      }
      if (code !== 100 && code !== 150) throw new KsefAuthError("denied");
      if (attempt < 14) await this.delay(1500);
    }
    throw new KsefAuthError("pending");
  }
}
