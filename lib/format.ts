// Sayı, yüzde, dolar ve tarih biçimlendirme.
// Hepsi tarayıcının Intl API'sini Türkçe ayarla kullanır: ondalık virgül, binlik nokta.

const LOCALE = "tr-TR";

// ---- Sayılar ----

// Sayı: 1234.5 -> "1.234,50". signed=true ise artı işareti de yazılır: "+1.234,50".
export function formatNumber(value: number, digits = 2, signed = false): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    // "negative": yalnızca gerçekten negatif sayılara eksi koyar. JSON'daki -0.0
    // değerleri böylece "-0,00" değil "0,00" görünür.
    signDisplay: signed ? "exceptZero" : "negative",
  }).format(value);
}

// Yüzde: 12.34 -> "%12,34". Veri zaten yüzde biriminde geldiği için 100'e bölünür.
export function formatPercent(value: number, digits = 2, signed = false): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "negative",
  }).format(value / 100);
}

// Oran: 0.001 -> "%0,1" (gereksiz sıfır yazılmaz). Komisyon oranı için kullanılır.
export function formatRate(rate: number): string {
  return new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 3 }).format(rate);
}

// Bölünmez boşluk: sayı ile $ işareti satır sonunda birbirinden ayrılmasın diye kullanılır.
const NBSP = "\u00a0";

// Dolar: 24336.74 -> "24.336,74 $"
export function formatDollar(value: number, digits = 2, signed = false): string {
  return `${formatNumber(value, digits, signed)}${NBSP}$`;
}

// ---- Tarihler ----
// "2026-10-02" gibi metinler UTC gece yarısı olarak okunur. Ziyaretçinin saat dilimi
// günü bir geri kaydırmasın diye biçimlendirme de UTC'de yapılır.

// Gün: "2026-10-02" -> "2 Eki 2026"
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));
}

// Ay: "2016-10" -> "Eki 2016"
export function formatMonth(isoMonth: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoMonth));
}

// Tarih ve saat, ziyaretçinin kendi saat diliminde: "5 Eki 2026 12:41"
export function formatDateTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDateTime));
}

// ---- Listeler ----

// ["SPY", "QQQ", "GLD"] -> "SPY, QQQ ve GLD"
export function formatList(items: string[]): string {
  return new Intl.ListFormat(LOCALE, { type: "conjunction" }).format(items);
}
