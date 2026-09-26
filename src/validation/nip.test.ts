import { describe, expect, it } from 'vitest';
import { NipValidator } from './nip';

describe('NipValidator', () => {
  it('accepts a valid formatted NIP', () => expect(NipValidator.isValid('526-104-08-28')).toBe(true));
  it('rejects an invalid checksum', () => expect(NipValidator.isValid('5261040829')).toBe(false));
});
