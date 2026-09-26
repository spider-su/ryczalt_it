export type AuthErrorCode =
  | "invalid_credentials"
  | "invalid_response"
  | "activation_failed"
  | "unavailable"
  | "unknown";

export function authErrorForStatus(status: number): AuthErrorCode {
  if (status === 401 || status === 403) return "invalid_credentials";
  if (status >= 500) return "unavailable";
  if (status === 400 || status === 404 || status === 409)
    return "activation_failed";
  return "unknown";
}

export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return [
    "invalid_credentials",
    "invalid_response",
    "activation_failed",
    "unavailable",
    "unknown",
  ].includes(value);
}

export function authErrorForFailure(value: unknown): AuthErrorCode {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { status?: unknown }).status === "number"
  ) {
    return authErrorForStatus((value as { status: number }).status);
  }
  if (
    value &&
    typeof value === "object" &&
    ["timeout", "cancelled", "unavailable"].includes(
      String((value as { kind?: unknown }).kind),
    )
  )
    return "unavailable";
  if (value instanceof Error && isAuthErrorCode(value.message))
    return value.message;
  return "unavailable";
}
