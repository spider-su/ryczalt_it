import { describe, expect, it } from 'vitest';
import { mapRecognizedCost, missingRequiredInput } from './costPresentation';
import { recognitionWithNoRequiredInputs, recognitionWithRequiredInputs } from '../data/mocks/canonicalAccounting';

describe('native invoice recognition presentation', () => {
  it('accepts requiredInputs=[] as a fully resolved candidate', () => {
    const review = mapRecognizedCost(recognitionWithNoRequiredInputs);
    expect(review.state).toBe('supported');
    expect(review.requiredInputs).toEqual([]);
  });
  it('renders backend-defined unresolved fields without hardcoding the decision set', () => {
    const review = mapRecognizedCost(recognitionWithRequiredInputs);
    expect(review.state).toBe('requires_input');
    expect(missingRequiredInput(review.requiredInputs, { classification: null })).not.toBeNull();
    expect(missingRequiredInput(review.requiredInputs, { classification: 'FUEL' })).toBeNull();
  });
});
