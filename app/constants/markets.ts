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
 * ONE fixed categorical-ramp index per market, used everywhere the market appears
 * (charts, tags, legends) so a market keeps the same color across the whole app.
 * Indexes point at the --chart-0..13 design tokens; never remap to Aura semantic colors.
 */
export const MARKET_CHART_INDEX: Record<MarketCode, number> = {
  US: 0,
  JP: 1,
  TW: 2,
  DE: 3,
}

export function chartTokenForMarket(market: MarketCode): string {
  return `var(--chart-${MARKET_CHART_INDEX[market]})`
}

/**
 * Currencies with no minor unit. JPY is the one that matters here: it must render with
 * 0 decimals everywhere (the single client-side money rule — conversion is server-side).
 */
export const ZERO_DECIMAL_CURRENCIES: readonly CurrencyCode[] = ['JPY']

export function currencyFractionDigits(currency: CurrencyCode): number {
  return ZERO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2
}
