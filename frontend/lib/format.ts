import type { Locale } from "@/i18n/config";

// ar-DZ gives Algerian month names (جانفي، فيفري…) and Latin digits.
const INTL: Record<Locale, string> = { ar: "ar-DZ", fr: "fr-DZ", en: "en-GB" };

export const intlLocale = (l: Locale) => INTL[l];

export function fmtNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(INTL[locale], { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}

export function fmtPct(n: number, locale: Locale) {
  return new Intl.NumberFormat(INTL[locale], { style: "percent", maximumFractionDigits: 0 }).format(n / 100);
}

export function fmtMonth(key: string, locale: Locale, style: "short" | "long" = "short") {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(INTL[locale], { month: style, timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
}

export function fmtDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso));
}

/** Pick the localized name: Arabic for ar, French for fr/en (no English names in the data). */
export function pick<T extends Record<string, unknown>>(obj: T, base: string, locale: Locale): string {
  return String(obj[`${base}_${locale === "ar" ? "ar" : "fr"}`] ?? "");
}
