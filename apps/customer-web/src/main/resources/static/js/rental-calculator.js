(() => {
  const rent = document.getElementById('monthly-rent');
  const months = document.getElementById('months');
  const extra = document.getElementById('extra-income');
  const revenueOutput = document.getElementById('revenue-result');
  const taxOutput = document.getElementById('tax-result');
  const error = document.getElementById('calculator-error');
  if (!rent || !months || !extra || !revenueOutput || !taxOutput || !error) return;

  const parseGrosz = (value) => {
    const normalized = value.trim().replace(',', '.');
    if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
    const [zloty, fraction = ''] = normalized.split('.');
    return BigInt(zloty) * 100n + BigInt((fraction + '00').slice(0, 2));
  };

  const formatMoney = (grosz, decimals) => {
    const amount = Number(grosz) / 100;
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0
    }).format(amount) + (decimals ? ' zł' : ' zł');
  };

  const update = () => {
    const monthly = parseGrosz(rent.value);
    const additional = parseGrosz(extra.value);
    const monthCount = Number(months.value);
    const valid = monthly !== null && additional !== null && Number.isInteger(monthCount)
      && monthCount >= 1 && monthCount <= 12
      && monthly <= 1_000_000_000n && additional <= 10_000_000_000n;
    error.hidden = valid;
    if (!valid) return;

    const revenue = monthly * BigInt(monthCount) + additional;
    const threshold = 10_000_000n;
    const lowerTaxNumerator = (revenue < threshold ? revenue : threshold) * 850n;
    const excess = revenue > threshold ? revenue - threshold : 0n;
    const taxNumerator = lowerTaxNumerator + excess * 1250n;
    const taxWholeZloty = (taxNumerator + 500_000n) / 1_000_000n;
    revenueOutput.textContent = formatMoney(revenue, true);
    taxOutput.textContent = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Number(taxWholeZloty)) + ' zł';
  };

  [rent, months, extra].forEach((input) => input.addEventListener('input', update));
  update();
})();
