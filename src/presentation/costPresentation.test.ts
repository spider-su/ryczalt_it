import { describe, expect, it } from 'vitest';
import { findPreviousMonthInvoice, mapRecognizedCost, missingRequiredInput, normalizeManualDecimal, previousAccountingMonth, validateManualCostDraft, type ManualCostDraft } from './costPresentation';
import type { InvoiceDto } from '../api/dto/accounting';
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
  it('matches autofill only by counterparty and direction from the previous period', () => {
    expect(previousAccountingMonth(2026, 1)).toBe('2025-12');
    const invoice = {
      id: 1,
      direction: 'PURCHASE',
      reference: 'FV/1',
      issueDate: '2026-08-10',
      accountingDate: '2026-08-10',
      netAmount: '100.00',
      vatAmount: '23.00',
      grossAmount: '123.00',
      currency: 'PLN',
      bookedNetPln: '100.00',
      ryczaltRate: '3.00',
      deductibleVat: '11.50',
      vatDeductionRatio: '50.00',
      classification: 'FUEL',
      vatTreatment: 'DOMESTIC_PURCHASE',
      counterparty: { id: 42, legalName: 'Supplier', alias: null, taxIdentifier: null },
      approvalStatus: 'APPROVED',
      approvalMethod: 'MANUAL',
      paymentVerificationPolicy: 'REQUIRED',
      paymentStatus: 'NOT_REQUIRED',
      sourceType: 'UPLOAD',
      sourceReference: null,
    } satisfies InvoiceDto;
    expect(findPreviousMonthInvoice([invoice], { ...recognitionWithRequiredInputs, counterpartyId: 42 })).toBe(invoice);
    expect(findPreviousMonthInvoice([invoice], { ...recognitionWithRequiredInputs, counterpartyId: 7 })).toBeNull();
    expect(findPreviousMonthInvoice([{ ...invoice, direction: 'INCOME' }], { ...recognitionWithRequiredInputs, counterpartyId: 42 })).toBeNull();
  });
});
