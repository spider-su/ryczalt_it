(() => {
  const calculate = (monthly, monthCount, additional, spouseThreshold) => {
    if (monthly === null || additional === null || !Number.isInteger(monthCount) || monthCount < 1 || monthCount > 12
      || monthly > 1_000_000_000n || additional > 10_000_000_000n) return null;
    const revenue = monthly * BigInt(monthCount) + additional;
    const threshold = spouseThreshold ? 20_000_000n : 10_000_000n;
    const lowerBase = revenue < threshold ? revenue : threshold;
    const excess = revenue > threshold ? revenue - threshold : 0n;
    const roundTax = (numerator) => (numerator + 500_000n) / 1_000_000n;
    return {
      revenue,
      lowerTax: roundTax(lowerBase * 850n),
      upperTax: roundTax(excess * 1250n),
      totalTax: roundTax(lowerBase * 850n + excess * 1250n),
      remaining: revenue >= threshold ? 0n : threshold - revenue
    };
  };
  globalThis.RentalTaxCalculator = { calculate };
  const rent = document.getElementById('monthly-rent');
  const months = document.getElementById('months');
  const extra = document.getElementById('extra-income');
  const spouse = document.getElementById('spouse-threshold');
  const revenueOutput = document.getElementById('revenue-result');
  const lowerTaxOutput = document.getElementById('lower-tax-result');
  const upperTaxOutput = document.getElementById('upper-tax-result');
  const taxOutput = document.getElementById('tax-result');
  const remainingOutput = document.getElementById('threshold-remaining-result');
  const error = document.getElementById('calculator-error');
  if (!rent || !months || !extra || !spouse || !revenueOutput || !lowerTaxOutput || !upperTaxOutput || !taxOutput || !remainingOutput || !error) return;

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
    const result = calculate(monthly, monthCount, additional, spouse.checked);
    error.hidden = result !== null;
    if (result === null) return;
    const wholeMoney = (amount) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Number(amount)) + ' zł';
    revenueOutput.textContent = formatMoney(result.revenue, true);
    lowerTaxOutput.textContent = wholeMoney(result.lowerTax);
    upperTaxOutput.textContent = wholeMoney(result.upperTax);
    taxOutput.textContent = wholeMoney(result.totalTax);
    remainingOutput.textContent = formatMoney(result.remaining, true);
  };

  [rent, months, extra, spouse].forEach((input) => input.addEventListener('input', update));
  update();
})();
