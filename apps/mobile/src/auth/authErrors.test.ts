import { describe, expect, it } from 'vitest';
import { authErrorForFailure, authErrorForStatus } from './authErrors';

describe('authentication error semantics', () => {
  it('maps authentication responses to stable codes', () => {
    expect(authErrorForStatus(401)).toBe('invalid_credentials');
    expect(authErrorForStatus(500)).toBe('unavailable');
    expect(authErrorForStatus(422)).toBe('unknown');
  });

  it('does not expose server prose as application error state', () => {
    expect(authErrorForFailure(new Error('invalid_credentials'))).toBe('invalid_credentials');
    expect(authErrorForFailure(new Error('Email or password is incorrect'))).toBe('unavailable');
    expect(authErrorForFailure('network failure')).toBe('unavailable');
  });
});
