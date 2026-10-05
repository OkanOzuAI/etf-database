// Number, percent, dollar and date formatting.
// Everything uses the browser's Intl API with US English rules: 1,234.56 and Oct 2, 2026.

const LOCALE = "en-US";

// ---- Numbers ----

// Number: 1234.5 -> "1,234.50". With signed=true a plus sign is written too: "+1,234.50".
export function formatNumber(value: number, digits = 2, signed = false): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    // "negative" puts a minus only on numbers that are really negative, so a -0.0
    // from the JSON is shown as "0.00" and not as "-0.00".
    signDisplay: signed ? "exceptZero" : "negative",
  }).format(value);
}

// Percent: 12.34 -> "12.34%". The data is already in percent units, so only the % sign is added.
export function formatPercent(value: number, digits = 2, signed = false): string {
  return `${formatNumber(value, digits, signed)}%`;
}

// Rate: 0.001 -> "0.1%" (no extra zeros). Used for the commission rate.
export function formatRate(rate: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 3 }).format(rate);
}

// Dollar: 24336.74 -> "$24,336.74". With signed=true: "+$14,336.73".
export function formatDollar(value: number, digits = 2, signed = false): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "negative",
  }).format(value);
}

// ---- Dates ----
// Texts like "2026-10-02" are read as midnight UTC. The formatting is done in UTC too,
// so the visitor's time zone cannot move the day back by one.

// Day: "2026-10-02" -> "Oct 2, 2026"
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(isoDate));
}

// Day without the year: "2026-10-02" -> "Oct 2"
export function formatDay(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(isoDate),
  );
}

// Month: "2016-10" -> "Oct 2016"
export function formatMonth(isoMonth: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(isoMonth),
  );
}

// Date and time in the visitor's own time zone: "Oct 5, 2026, 2:31 PM"
export function formatDateTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(isoDateTime),
  );
}
