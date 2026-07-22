import type { CurrencyCode, Money } from '~/types/api'
import { currencyForMarket, currencyFractionDigits, type MarketFilter } from '~/constants/markets'

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

/** Currency amount. JPY renders with 0 decimals; USD/TWD/EUR with 2. */
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

/** Read one currency out of a Money map and format it (Analytics: the selected currency). */
export function formatMoney(money: Money, currency: CurrencyCode, locale: SupportedLocale): string {
  return formatCurrency(money[currency], currency, locale)
}

/**
 * Format a Money map in the record's NATIVE currency — the correct behaviour everywhere
 * except Analytics, where a currency selector normalizes markets. "All" resolves to USD.
 */
export function formatNativeMoney(
  money: Money,
  market: MarketFilter,
  locale: SupportedLocale,
): string {
  const currency = currencyForMarket(market)
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
