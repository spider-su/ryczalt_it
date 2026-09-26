import { describe, expect, it } from 'vitest';
import { currentSessionEpoch, registerSessionRequest, rotateAccountingSession } from './sessionState';

describe('accounting session state', () => {
  it('rotates the epoch and aborts requests from the previous session', () => {
    const controller = new AbortController();
    const unregister = registerSessionRequest(controller);
    const before = currentSessionEpoch();
    const after = rotateAccountingSession();

    expect(after).toBe(before + 1);
    expect(controller.signal.aborted).toBe(true);
    unregister();
  });

  it('removes completed requests before a later session transition', () => {
    const controller = new AbortController();
    const unregister = registerSessionRequest(controller);
    unregister();
    rotateAccountingSession();
    expect(controller.signal.aborted).toBe(false);
  });
});
