// ar-DZ gives Algerian month names (جانفي، فيفري…) and Latin digits.
const INTL = { ar: "ar-DZ", fr: "fr-DZ", en: "en-GB" };

export const intlLocale = (l) => INTL[l];

export function fmtNumber(n, locale) {
  return new Intl.NumberFormat(INTL[locale], { notation: n >= 10000 ? "compact" : "standard" }).format(n);
}

export function fmtPct(n, locale) {
  return new Intl.NumberFormat(INTL[locale], { style: "percent", maximumFractionDigits: 0 }).format(n / 100);
}

export function fmtMonth(key, locale, style = "short") {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(INTL[locale], { month: style, timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
}

export function fmtDate(iso, locale, withYear = false) {
  return new Intl.DateTimeFormat(INTL[locale], {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function fmtDateTime(iso, locale) {
  return new Intl.DateTimeFormat(INTL[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtTime(iso, locale) {
  return new Intl.DateTimeFormat(INTL[locale], { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function fmtDay(iso, locale) {
  return new Intl.DateTimeFormat(INTL[locale], { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

/** Pick the localized name: Arabic for ar, French for fr/en (no English names in the data). */
export function pick(obj, base, locale) {
  return String(obj[`${base}_${locale === "ar" ? "ar" : "fr"}`] ?? "");
}
