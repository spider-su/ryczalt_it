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
};

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor({ baseUrl, timeoutMs = 10_000, fetchImpl = fetch }: HttpClientOptions) {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      throw new ConfigurationError('Investory API URL is not configured correctly');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    // Keep the browser Window receiver required by native window.fetch.
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  async get<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}${path}`;
      const response = await this.fetchImpl(url, {
        ...init,
        method: init.method ?? 'GET',
        // The web POC reuses the authenticated Investory browser session.
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...init.headers,
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
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
