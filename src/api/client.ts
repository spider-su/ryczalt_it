export class ConfigurationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ApiError extends Error {
  public readonly kind: 'authentication' | 'not-found' | 'unavailable' | 'response';

  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown,
    kind: 'authentication' | 'not-found' | 'unavailable' | 'response' = 'response'
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

type HttpClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  token?: string | null | (() => string | null);
  onUnauthorized?: () => void;
};

export const DEFAULT_REQUEST_TIMEOUT_MS = 180_000;

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly token: string | null | (() => string | null);
  private readonly onUnauthorized?: () => void;

  constructor({ baseUrl, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, fetchImpl = fetch, token, onUnauthorized }: HttpClientOptions) {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      throw new ConfigurationError('Investory API URL is not configured correctly');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    // Keep the browser Window receiver required by native window.fetch.
    this.fetchImpl = fetchImpl.bind(globalThis);
    this.token = token ?? null;
    this.onUnauthorized = onUnauthorized;
  }

  async get<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, init);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async postForm<T>(path: string, body: FormData): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  async postVoid(path: string, body: unknown): Promise<void> {
    await this.request<unknown>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, false);
  }

  private async request<T>(path: string, init: RequestInit, expectJson = true): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}${path}`;
      const currentToken = typeof this.token === 'function' ? this.token() : this.token;
      const response = await this.fetchImpl(url, {
        ...init,
        method: init.method ?? 'GET',
        // The web POC reuses the authenticated Investory browser session.
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...init.headers,
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (response.status === 401) this.onUnauthorized?.();
          throw new ApiError(
            response.status === 401
              ? 'Investory authentication is required'
              : 'Investory access is not authorized',
            response.status,
            undefined,
            'authentication'
          );
        }
        if (response.status === 404) {
          throw new ApiError('Investory accounting data was not found', response.status, undefined, 'not-found');
        }
        throw new ApiError(`Investory API returned HTTP ${response.status}`, response.status);
      }

      if (!expectJson || response.status === 204) return undefined as T;
      try {
        return (await response.json()) as T;
      } catch (error) {
        throw new ApiError('Investory API returned malformed JSON', response.status, error);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Investory API request timed out', undefined, error);
      }
      throw new ApiError('Investory API is unavailable', undefined, error, 'unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
