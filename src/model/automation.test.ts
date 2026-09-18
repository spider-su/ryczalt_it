import { describe, expect, it } from 'vitest';
import { canonicalAutoApprovalAmount, categoriesFromInput, categoriesInputValue, mapAutoApprovalSettings } from './automation';

describe('auto-approval settings domain', () => {
  it('preserves exact decimal strings without numeric conversion', () => {
    expect(canonicalAutoApprovalAmount('0')).toBe('0');
    expect(canonicalAutoApprovalAmount('1.23')).toBe('1.23');
    expect(canonicalAutoApprovalAmount('1000.00')).toBe('1000.00');
    expect(canonicalAutoApprovalAmount('1234567.89')).toBe('1234567.89');
    expect(canonicalAutoApprovalAmount('1,50')).toBe('1.50');
    expect(canonicalAutoApprovalAmount('-1')).toBeNull();
    expect(canonicalAutoApprovalAmount('')).toBeNull();
  });

  it('round-trips canonical categories and preserves unknown values', () => {
    const categories = ['ACCOUNTING_SERVICE', 'FUTURE_CATEGORY'];
    expect(categoriesFromInput(categoriesInputValue(categories))).toEqual(categories);
    expect(categoriesFromInput('ACCOUNTING_SERVICE, FUTURE_CATEGORY')).toEqual(categories);
  });

  it('rejects malformed backend settings instead of guessing state', () => {
    expect(mapAutoApprovalSettings({ enabled: true, maxAmount: '1234567.89', trustedCategories: ['FUTURE_CATEGORY'] })).toEqual({ enabled: true, maxAmount: '1234567.89', trustedCategories: ['FUTURE_CATEGORY'] });
    expect(() => mapAutoApprovalSettings({ enabled: 'true', maxAmount: '1.00', trustedCategories: [] })).toThrow('invalid_auto_approval_response');
    expect(() => mapAutoApprovalSettings({ enabled: true, maxAmount: '1.00', trustedCategories: [null] })).toThrow('invalid_auto_approval_response');
  });
});
