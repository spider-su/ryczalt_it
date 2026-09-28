const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(new URL('../../main/resources/static/js/rental-calculator.js', `file://${__filename}`), 'utf8');
const context = { document: { getElementById: () => null } };
vm.runInNewContext(source, context);
const calculate = context.RentalTaxCalculator.calculate;

test('calculates revenue below the standard threshold', () => {
  const result = calculate(400_000n, 12, 0n, false);
  assert.equal(result.revenue, 4_800_000n);
  assert.equal(result.lowerTax, 4_080n);
  assert.equal(result.upperTax, 0n);
  assert.equal(result.totalTax, 4_080n);
  assert.equal(result.remaining, 5_200_000n);
});

test('applies only the lower rate exactly at the threshold', () => {
  const result = calculate(10_000_000n, 1, 0n, false);
  assert.equal(result.lowerTax, 8_500n);
  assert.equal(result.upperTax, 0n);
  assert.equal(result.remaining, 0n);
});

test('applies the higher rate only to revenue above threshold', () => {
  const result = calculate(10_100_000n, 1, 0n, false);
  assert.equal(result.lowerTax, 8_500n);
  assert.equal(result.upperTax, 125n);
  assert.equal(result.totalTax, 8_625n);
});

test('uses the spouse threshold only when selected', () => {
  assert.equal(calculate(15_000_000n, 1, 0n, true).upperTax, 0n);
  assert.equal(calculate(20_100_000n, 1, 0n, true).upperTax, 125n);
});

test('accepts zero revenue and additional income', () => {
  const result = calculate(0n, 1, 0n, false);
  assert.equal(result.revenue, 0n);
  assert.equal(result.totalTax, 0n);
  assert.equal(result.remaining, 10_000_000n);
});

test('rejects invalid month counts', () => {
  assert.equal(calculate(100n, 0, 0n, false), null);
  assert.equal(calculate(100n, 13, 0n, false), null);
  assert.equal(calculate(100n, 1.5, 0n, false), null);
});
