/** A fee with the currency's local symbol: "Rs 4,500", "$50", "AED 300". */
export function formatFee(amount: number, currency = 'PKR') {
  const opts = { style: 'currency', currency, maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 } as const;
  try {
    return new Intl.NumberFormat('en', { ...opts, currencyDisplay: 'narrowSymbol' }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

// Currencies offered when registering or editing a facility; any other ISO code can be added here
export const CURRENCIES = [
  'PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'INR', 'BDT', 'LKR', 'NPR', 'AFN',
  'CAD', 'AUD', 'NZD', 'SGD', 'MYR', 'IDR', 'PHP', 'THB', 'CNY', 'JPY', 'KRW', 'TRY', 'EGP', 'NGN', 'KES',
  'ZAR', 'CHF', 'SEK', 'NOK', 'DKK', 'BRL', 'MXN',
];

/** "AED — UAE Dirham" where the browser can name it, otherwise just the code. */
export function currencyLabel(code: string) {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(code);
    return name && name !== code ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}

/** The browser's IANA timezone, e.g. "Asia/Dubai". */
export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi';
  } catch {
    return 'Asia/Karachi';
  }
}

/** Every IANA timezone the browser knows, for the facility settings picker. */
export function allTimezones(current?: string) {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
  } catch {
    // Older browsers: offer the current and browser zones only
  }
  return [...new Set([current, browserTimezone(), ...zones].filter(Boolean) as string[])].sort();
}

// A starting guess from where the browser is; the user can change it
const CURRENCY_BY_ZONE: Record<string, string> = {
  'Asia/Karachi': 'PKR', 'Asia/Dubai': 'AED', 'Asia/Riyadh': 'SAR', 'Asia/Qatar': 'QAR', 'Asia/Kuwait': 'KWD',
  'Asia/Muscat': 'OMR', 'Asia/Bahrain': 'BHD', 'Asia/Kolkata': 'INR', 'Asia/Calcutta': 'INR', 'Asia/Dhaka': 'BDT',
  'Asia/Colombo': 'LKR', 'Asia/Kathmandu': 'NPR', 'Asia/Kabul': 'AFN', 'Europe/London': 'GBP', 'Asia/Singapore': 'SGD',
  'Asia/Kuala_Lumpur': 'MYR', 'Asia/Jakarta': 'IDR', 'Asia/Manila': 'PHP', 'Asia/Bangkok': 'THB', 'Asia/Shanghai': 'CNY',
  'Asia/Tokyo': 'JPY', 'Asia/Seoul': 'KRW', 'Europe/Istanbul': 'TRY', 'Africa/Cairo': 'EGP', 'Africa/Lagos': 'NGN',
  'Africa/Nairobi': 'KES', 'Africa/Johannesburg': 'ZAR', 'Europe/Zurich': 'CHF', 'Europe/Stockholm': 'SEK',
  'Europe/Oslo': 'NOK', 'Europe/Copenhagen': 'DKK', 'America/Sao_Paulo': 'BRL', 'America/Mexico_City': 'MXN',
  'America/Toronto': 'CAD', 'America/Vancouver': 'CAD', 'Pacific/Auckland': 'NZD',
};

export function guessCurrency(timezone = browserTimezone()) {
  if (CURRENCY_BY_ZONE[timezone]) return CURRENCY_BY_ZONE[timezone];
  if (timezone.startsWith('Australia/')) return 'AUD';
  if (timezone.startsWith('America/')) return 'USD';
  if (timezone.startsWith('Europe/')) return 'EUR';
  return 'PKR';
}
