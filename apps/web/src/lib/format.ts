/** Single source of truth for price/date formatting across the Mini App.
 *  Uses the active user locale so RU/EN users see their own number/date formats. */

export type FormatLocale = 'es-AR' | 'ru' | 'en';

const toIntlLocale = (locale: FormatLocale): string =>
  locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : 'es-AR';

/** Format an ARS amount following the active locale (e.g. 18.000 / 18,000). */
export function formatPrice(amount: number | null | undefined, locale: FormatLocale): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '';
  return new Intl.NumberFormat(toIntlLocale(locale), {maximumFractionDigits: 0}).format(amount);
}

/** Format a date/time following the active locale. */
export function formatDate(date: string | Date, locale: FormatLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(toIntlLocale(locale), {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
}

/** Format a full date/time (for message timestamps). */
export function formatDateTime(date: string | Date, locale: FormatLocale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(toIntlLocale(locale));
}