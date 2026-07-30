import type { CurrencyCode, MarketCode } from '~/types/api'

/** The four operating markets, in canonical display order. */
export const MARKETS: MarketCode[] = ['US', 'JP', 'TW', 'DE']

/** A market filter can also be "All" (cross-market). */
export type MarketFilter = MarketCode | 'All'

/**
 * Each market's native currency. Off Analytics, monetary values render in the record's
 * native currency — this map is how the client picks which `Money` key to read.
 * Records whose market is "All" display in USD (international/base currency).
 */
export const MARKET_CURRENCY: Record<MarketCode, CurrencyCode> = {
  US: 'USD',
  JP: 'JPY',
  TW: 'TWD',
  DE: 'EUR',
}

export function currencyForMarket(market: MarketFilter): CurrencyCode {
  return market === 'All' ? 'USD' : MARKET_CURRENCY[market]
}

/**
 * ONE fixed colour per market, used everywhere the market appears (charts, tags,
 * legends) so a market reads the same across the whole app. A market's colour must
 * never depend on how many series a chart happens to render — which is why Chart.js's
 * built-in `Colors` plugin is not used: it assigns by dataset index.
 *
 * HEX, not a CSS custom property, and deliberately so. Chart.js draws on a canvas and
 * needs a real colour string; `withAlpha()` in useChartTheme parses **hex only**, and
 * Nuxt UI's tokens resolve to `oklch()`, which it would pass through unfaded — silently
 * turning every area fill opaque. Do not "unify" these into `--ui-*`.
 *
 * Values are Tailwind palette steps (600 light / 400 dark) chosen to sit beside the
 * emerald-and-slate identity in app.config.ts. Keep them coordinated by hand.
 */
export const MARKET_COLOR: Record<MarketCode, { light: string; dark: string }> = {
  US: { light: '#0284c7', dark: '#38bdf8' }, // sky-600 / sky-400
  JP: { light: '#d97706', dark: '#fbbf24' }, // amber-600 / amber-400
  TW: { light: '#7c3aed', dark: '#a78bfa' }, // violet-600 / violet-400
  DE: { light: '#0d9488', dark: '#2dd4bf' }, // teal-600 / teal-400
}

/**
 * Currencies with no minor unit. JPY is the one that matters here: it must render with
 * 0 decimals everywhere (the single client-side money rule — conversion is server-side).
 */
export const ZERO_DECIMAL_CURRENCIES: readonly CurrencyCode[] = ['JPY']

export function currencyFractionDigits(currency: CurrencyCode): number {
  return ZERO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2
}
