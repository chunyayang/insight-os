import type { CurrencyCode, Money } from '~/types/api'
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDelta,
  formatMoney,
  formatMonthDay,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  intlLocale,
} from '~/utils/format'

/**
 * The single entry point for number/currency/date formatting in components.
 *
 * Binds the pure formatters in utils/format.ts to the active i18n locale, so components
 * never touch Intl directly and never hand-format. Reactive: switching language
 * re-renders every formatted value with the right separators and date order.
 *
 * Money rules enforced here: JPY and TWD have 0 decimals, and the client only ever PICKS a
 * currency key out of a `Money` map — it never converts between currencies.
 */
export function useFormat() {
  const { locale } = useI18n()
  const loc = computed(() => intlLocale(locale.value))

  return {
    /**
     * Render a Money map in the given currency. The caller reads the right key first:
     * the presentation currency for a cross-market aggregate or the Analytics
     * selector, a record's own declared currency everywhere else.
     */
    money: (money: Money, currency: CurrencyCode) => formatMoney(money, currency, loc.value),

    /** A bare amount whose currency is already known. */
    currency: (value: number, currency: CurrencyCode) => formatCurrency(value, currency, loc.value),
    /** Abbreviated amount for chart axes; tooltips and cells use the full `currency`. */
    compactCurrency: (value: number, currency: CurrencyCode) =>
      formatCompactCurrency(value, currency, loc.value),

    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, loc.value, options),
    compact: (value: number) => formatCompactNumber(value, loc.value),

    /** Ratios: 0.031 -> "3.1%". */
    percent: (value: number, fractionDigits?: number) =>
      formatPercent(value, loc.value, fractionDigits),
    /** Signed trend delta: 0.042 -> "+4.2%". */
    delta: (value: number, fractionDigits?: number) =>
      formatDelta(value, loc.value, fractionDigits),

    date: (iso: string) => formatDate(iso, loc.value),
    /** Calendar date without the year, for dense axes: "Sep 17". */
    monthDay: (isoDate: string) => formatMonthDay(isoDate, loc.value),
    dateTime: (iso: string) => formatDateTime(iso, loc.value),
    relativeTime: (iso: string, now?: Date) => formatRelativeTime(iso, loc.value, now),
  }
}
