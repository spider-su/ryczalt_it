import { describe, expect, it } from 'vitest';
import { mapRecognizedCost, missingRequiredInput, normalizeManualDecimal, validateManualCostDraft, type ManualCostDraft } from './costPresentation';
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
  it('validates required manual invoice fields and accepts optional due dates', () => {
    const draft: ManualCostDraft = { counterparty: 'Supplier', taxIdentifier: '', reference: 'FV/12', issueDate: '2026-09-20', dueDate: '', currency: 'PLN', netAmount: '100,00', vatAmount: '23.00', grossAmount: '123.00' };
    expect(validateManualCostDraft(draft)).toBeNull();
    expect(validateManualCostDraft({ ...draft, issueDate: '2026-02-30' })).toBe('issueDate');
    expect(validateManualCostDraft({ ...draft, dueDate: 'tomorrow' })).toBe('dueDate');
    expect(validateManualCostDraft({ ...draft, grossAmount: '1e2' })).toBe('grossAmount');
  });
  it('normalizes manual money strings without floating-point conversion', () => {
    expect(normalizeManualDecimal('001234,5000')).toBe('1234.5000');
    expect(normalizeManualDecimal('-0.25')).toBe('-0.25');
    expect(normalizeManualDecimal('1,2.3')).toBeNull();
    expect(normalizeManualDecimal('Infinity')).toBeNull();
  });
});
