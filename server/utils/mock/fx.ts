import type { CurrencyCode, FxProvenance, MarketCode, Money } from '../../../app/types/api'
import { seededRange } from './seed'

export const CURRENCIES: CurrencyCode[] = ['USD', 'JPY', 'TWD', 'EUR']

/**
 * Each market's native currency. The API declares this per monetary record so the client
 * can render native amounts off-Analytics without any currency selector.
 * Records whose market is "All" use USD (international/base currency).
 */
export const MARKET_NATIVE_CURRENCY: Record<MarketCode, CurrencyCode> = {
  US: 'USD',
  JP: 'JPY',
  TW: 'TWD',
  DE: 'EUR',
}

/** Baseline units of each currency per 1 USD. Daily rates drift deterministically around these. */
const BASE_PER_USD: Record<CurrencyCode, number> = {
  USD: 1,
  JPY: 157.0,
  TWD: 32.3,
  EUR: 0.92,
}

/**
 * The official rate table for one day: units of each currency per 1 USD.
 *
 * Deterministic per date, so re-querying the same range always reproduces the same
 * totals — the audit-stability the contract requires. In a real backend this is a
 * lookup against the recorded end-of-day official rates.
 */
export function dailyRates(date: string): Record<CurrencyCode, number> {
  const rates = {} as Record<CurrencyCode, number>
  for (const c of CURRENCIES) {
    // ±1.5% deterministic drift around the baseline.
    const drift = c === 'USD' ? 1 : seededRange(`fx:${date}:${c}`, 0.985, 1.015)
    rates[c] = BASE_PER_USD[c] * drift
  }
  return rates
}

export function emptyMoney(): Money {
  return { USD: 0, JPY: 0, TWD: 0, EUR: 0 }
}

/**
 * Convert ONE day's native amount into all four currencies at THAT day's official rate.
 *
 * This is the non-negotiable rule: a currency total is the sum of daily-converted
 * amounts, never the native total multiplied by a single period-end rate. Pivoting via
 * USD is fine because both legs use the same day's rates.
 */
export function convertDay(amount: number, native: CurrencyCode, date: string): Money {
  const rates = dailyRates(date)
  const usd = amount / rates[native]
  const money = emptyMoney()
  for (const c of CURRENCIES) money[c] = usd * rates[c]
  return money
}

export function addMoney(a: Money, b: Money): Money {
  const out = emptyMoney()
  for (const c of CURRENCIES) out[c] = a[c] + b[c]
  return out
}

export function sumMoney(items: Money[]): Money {
  return items.reduce(addMoney, emptyMoney())
}

/** JPY has no minor unit; the rest carry 2 decimals. Display formatting still happens client-side. */
export function roundMoney(money: Money): Money {
  return {
    USD: Math.round(money.USD * 100) / 100,
    JPY: Math.round(money.JPY),
    TWD: Math.round(money.TWD * 100) / 100,
    EUR: Math.round(money.EUR * 100) / 100,
  }
}

/**
 * Audit metadata describing how a Money map was derived. Deliberately NOT a rate table —
 * the client must never be able to reconstruct a multiplier and convert on its own.
 */
export function fxProvenance(rangeFrom: string, rangeTo: string): FxProvenance {
  return {
    method: 'historical-daily-official',
    source: 'internal-fx-eod',
    rangeFrom,
    rangeTo,
  }
}
