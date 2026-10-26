import type { CurrencyCode, Money } from '~/types/api'
import { currencyFractionDigits } from '~/constants/markets'

/**
 * Pure Intl formatters. The locale is passed in explicitly (rather than read from
 * useI18n) so this module stays free of Nuxt auto-imports and is unit-testable in a
 * plain Node environment. `useFormat()` binds these to the active locale for components.
 *
 * FORMATTING ONLY — the client never converts money. Conversion is server-side using
 * historical daily rates; here we just pick a `Money` key and render it.
 */

export type SupportedLocale = 'en-US' | 'zh-TW'

/** Map an i18n locale code to the Intl locale used for formatting. */
export function intlLocale(code: string): SupportedLocale {
  return code === 'zh-TW' ? 'zh-TW' : 'en-US'
}

/** Currency amount. JPY and TWD render with 0 decimals; USD/EUR with 2. */
export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  locale: SupportedLocale,
): string {
  const digits = currencyFractionDigits(currency)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/**
 * Read one currency out of a Money map and format it. The caller decides which key:
 * the presentation currency for a cross-market aggregate or the Analytics selector, a
 * record's own declared currency everywhere else — never derived from a market here.
 */
export function formatMoney(money: Money, currency: CurrencyCode, locale: SupportedLocale): string {
  return formatCurrency(money[currency], currency, locale)
}

export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

/** Abbreviated form for dense KPI tiles (e.g. 1.2M). */
export function formatCompactNumber(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

/**
 * Abbreviated currency for chart axes: "$100K" in en-US, "US$100K" in zh-TW. The locale
 * picks the symbol and sign; the suffix is K/M/B in every locale (currency-model.md §3).
 */
export function formatCompactCurrency(
  value: number,
  currency: CurrencyCode,
  locale: SupportedLocale,
): string {
  // Below 1K nothing is abbreviated, so a zero-decimal currency would show its minor unit.
  const amount = currencyFractionDigits(currency) === 0 ? Math.round(value) : value
  const abbreviated = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.abs(amount))

  // Keep the locale's symbol, sign and spacing; swap its digits for the abbreviation.
  let digitsPlaced = false
  return new Intl.NumberFormat(locale, { style: 'currency', currency })
    .formatToParts(amount)
    .map((part) => {
      if (!['integer', 'group', 'decimal', 'fraction'].includes(part.type)) return part.value
      if (digitsPlaced) return ''
      digitsPlaced = true
      return abbreviated
    })
    .join('')
}

/** A calendar date (YYYY-MM-DD) as month and day: "Sep 17" / "9月17日". */
export function formatMonthDay(isoDate: string, locale: SupportedLocale): string {
  // A date-only string parses as UTC midnight; formatting it in the viewer's zone would
  // show the previous day anywhere west of UTC.
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(isoDate))
}

/** `value` is a RATIO (0.031 -> "3.1%"), matching how the API returns conversion rates. */
export function formatPercent(value: number, locale: SupportedLocale, fractionDigits = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** Signed delta for trend indicators (+4.2% / -18.0%). */
export function formatDelta(value: number, locale: SupportedLocale, fractionDigits = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatDate(iso: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso))
}

export function formatDateTime(iso: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

/**
 * The viewer's own zone, read by name rather than left to Intl's default so the zone a
 * formatter uses is one value a test can pin. Browser-only in meaning: on the server it
 * names the host's zone, so callers render its output on the client alone.
 */
function viewerTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Today's date in the viewer's zone, in full: "Friday, July 3, 2026" / "2026年7月3日 星期五". */
export function formatLongDate(locale: SupportedLocale, now: Date = new Date()): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: viewerTimeZone(),
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now)
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening'

/** Which part of the viewer's day it is: morning 05–11, afternoon 12–17, evening otherwise. */
export function dayPeriod(now: Date = new Date()): DayPeriod {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: viewerTimeZone(),
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  )
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'evening'
}

/** Relative time for notifications/activity ("2 hours ago"). */
export function formatRelativeTime(
  iso: string,
  locale: SupportedLocale,
  now: Date = new Date(),
): string {
  const diffMs = new Date(iso).getTime() - now.getTime()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
  ]
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit)
  }
  return rtf.format(Math.round(diffMs / 1000), 'second')
}
