import { isNetworkOffline } from "./networkState";

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ApiError extends Error {
  public readonly kind:
    | "authentication"
    | "authorization"
    | "not-found"
    | "conflict"
    | "validation"
    | "timeout"
    | "cancelled"
    | "unavailable"
    | "response";

  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown,
    kind:
      | "authentication"
      | "authorization"
      | "not-found"
      | "conflict"
      | "validation"
      | "timeout"
      | "cancelled"
      | "unavailable"
      | "response" = "response",
  ) {
    super(message);
    this.name = "ApiError";
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

export type RequestOptions = { timeoutMs?: number; signal?: AbortSignal };

export const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
export const AUTH_REQUEST_TIMEOUT_MS = 20_000;
export const UPLOAD_REQUEST_TIMEOUT_MS = 120_000;
export const CALCULATION_REQUEST_TIMEOUT_MS = 180_000;

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly token: string | null | (() => string | null);
  private readonly onUnauthorized?: () => void;

  constructor({
    baseUrl,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    fetchImpl = fetch,
    token,
    onUnauthorized,
  }: HttpClientOptions) {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
      throw new ConfigurationError(
        "Investory API URL is not configured correctly",
      );
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async postEmpty<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(
      path,
      { method: "POST", signal: options?.signal },
      true,
      options?.timeoutMs,
    );
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async delete<T = void>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" }, false);
  }

  async postForm<T>(
    path: string,
    body: FormData,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(
      path,
      { method: "POST", body, signal: options?.signal },
      true,
      options?.timeoutMs,
    );
  }

  async postVoid(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<void> {
    await this.request<unknown>(
      path,
      {
        method: "POST",
        ...(body === undefined
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
        signal: options?.signal,
      },
      false,
      options?.timeoutMs,
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    expectJson = true,
    timeoutMs = this.timeoutMs,
  ): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const externalSignal = init.signal;
    const abortFromCaller = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else
        externalSignal.addEventListener("abort", abortFromCaller, {
          once: true,
        });
    }

    try {
      if (isNetworkOffline())
        throw new ApiError(
          "Investory API is unavailable while the device is offline",
          undefined,
          undefined,
          "unavailable",
        );
      const url = `${this.baseUrl}${path}`;
      const currentToken =
        typeof this.token === "function" ? this.token() : this.token;
      const response = await this.fetchImpl(url, {
        ...init,
        method: init.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...init.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const problemMessage = await this.readProblemMessage(response);
        if (response.status === 401 || response.status === 403) {
          if (response.status === 401) this.onUnauthorized?.();
          throw new ApiError(
            problemMessage ??
              (response.status === 401
                ? "Investory authentication is required"
                : "Investory access is not authorized"),
            response.status,
            undefined,
            response.status === 401 ? "authentication" : "authorization",
          );
        }
        if (response.status === 404) {
          throw new ApiError(
            problemMessage ?? "Investory accounting data was not found",
            response.status,
            undefined,
            "not-found",
          );
        }
        if (response.status === 409) {
          throw new ApiError(
            problemMessage ??
              "Investory request conflicts with current accounting state",
            response.status,
            undefined,
            "conflict",
          );
        }
        if (response.status === 400 || response.status === 422) {
          throw new ApiError(
            problemMessage ?? "Investory request failed validation",
            response.status,
            undefined,
            "validation",
          );
        }
        throw new ApiError(
          problemMessage ?? `Investory API returned HTTP ${response.status}`,
          response.status,
        );
      }

      if (!expectJson || response.status === 204) return undefined as T;
      try {
        return (await response.json()) as T;
      } catch (error) {
        throw new ApiError(
          "Investory API returned malformed JSON",
          response.status,
          error,
        );
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (isAbortError(error)) {
        if (timedOut)
          throw new ApiError(
            "Investory API request timed out",
            undefined,
            error,
            "timeout",
          );
        throw new ApiError(
          "Investory API request was cancelled",
          undefined,
          error,
          "cancelled",
        );
      }
      throw new ApiError(
        "Investory API is unavailable",
        undefined,
        error,
        "unavailable",
      );
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    }
  }

  private async readProblemMessage(response: Response): Promise<string | null> {
    if (!(response.headers.get("content-type") ?? "").includes("json"))
      return null;
    try {
      const body = (await response.clone().json()) as {
        message?: unknown;
        detail?: unknown;
      };
      if (typeof body.message === "string" && body.message.trim())
        return body.message;
      if (typeof body.detail === "string" && body.detail.trim())
        return body.detail;
    } catch {
      // Keep the HTTP status as the fallback when the error body is malformed.
    }
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return name === "AbortError";
}
