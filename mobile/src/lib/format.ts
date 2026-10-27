/** "850 m", "7.3 km", "1,029 km": decimals only where they mean something. */
export function formatKm(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/**
 * A fee in the facility's currency with its local symbol: "Rs 4,500", "$50", "AED 300".
 * Falls back to "PKR 4,500" where the JS engine lacks Intl currency support.
 */
export function formatFee(amount: number, currency = 'PKR') {
  const opts = { style: 'currency', currency, maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 } as const;
  try {
    return new Intl.NumberFormat('en', { ...opts, currencyDisplay: 'narrowSymbol' }).format(amount);
  } catch {
    try {
      return new Intl.NumberFormat('en', opts).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  }
}
