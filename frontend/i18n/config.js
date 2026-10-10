export const locales = ["ar", "fr", "en"];

export const defaultLocale = "ar";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value) {
  return !!value && locales.includes(value);
}

export function dirOf(locale) {
  return locale === "ar" ? "rtl" : "ltr";
}
