export type AuthErrorCode = 'invalid_credentials' | 'invalid_response' | 'unavailable' | 'unknown';

export function authErrorForStatus(status: number): AuthErrorCode {
  if (status === 401 || status === 403) return 'invalid_credentials';
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return ['invalid_credentials', 'invalid_response', 'unavailable', 'unknown'].includes(value);
}

export function authErrorForFailure(value: unknown): AuthErrorCode {
  if (value instanceof Error && isAuthErrorCode(value.message)) return value.message;
  return 'unavailable';
}
