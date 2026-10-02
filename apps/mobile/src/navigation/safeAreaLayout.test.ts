import { describe, expect, it } from 'vitest';
import { appSafeAreaEdges, fallbackSafeAreaEdges, modalSafeAreaEdges } from './safeAreaLayout';

describe('safe-area ownership', () => {
  it('assigns the app top edge, fallback both edges, and modal both edges', () => {
    expect(appSafeAreaEdges).toEqual(['top']);
    expect(fallbackSafeAreaEdges).toEqual(['top', 'bottom']);
    expect(modalSafeAreaEdges).toEqual(['top', 'bottom']);
  });
});
