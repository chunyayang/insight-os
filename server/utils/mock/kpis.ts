import type { CurrencyCode, KpiMetric, MarketCode } from '../../../app/types/api'
import { MARKET_FUNCTIONAL_CURRENCY } from './fx'
import { conversionOn, dailyMetrics, pctChange, revenueOn } from './markets'

/**
 * The currency a set of markets reports in. One market has the one it declares; several make an
 * aggregate, which has none (currency-model.md §3).
 */
export function functionalCurrencyOf(markets: MarketCode[]): CurrencyCode | null {
  return markets.length === 1 ? MARKET_FUNCTIONAL_CURRENCY[markets[0]!] : null
}

/**
 * The one currency the revenue KPI is in: its amount, delta and sparkline, and the AI summary's
 * revenue movement. One market's own, an aggregate's the presentation currency
 * (currency-model.md §3). Chosen here only, so the card can't pair one currency with another.
 */
export function revenueCurrency(
  markets: MarketCode[],
  presentationCurrency: CurrencyCode,
): CurrencyCode {
  return functionalCurrencyOf(markets) ?? presentationCurrency
}

/**
 * The Dashboard's four KPIs for `markets`: today compared with yesterday, each with a sparkline
 * over the `spark` days.
 */
export function buildKpis(
  markets: MarketCode[],
  presentationCurrency: CurrencyCode,
  days: { today: string; yesterday: string; spark: string[] },
  now = new Date(),
): KpiMetric[] {
  const sum = (date: string, pick: (m: ReturnType<typeof dailyMetrics>) => number) =>
    markets.reduce((total, m) => total + pick(dailyMetrics(m, date, now)), 0)

  const currency = revenueCurrency(markets, presentationCurrency)
  const revenue = (date: string) => revenueOn(markets, date, now)[currency]
  const revenueToday = revenue(days.today)

  const ordersToday = sum(days.today, (d) => d.orders)
  const usersToday = sum(days.today, (d) => d.activeUsers)
  const convToday = conversionOn(markets, days.today, now)

  return [
    {
      key: 'revenue',
      value: revenueToday,
      currency,
      deltaPct: pctChange(revenueToday, revenue(days.yesterday)),
      sparkline: days.spark.map(revenue),
    },
    {
      key: 'orders',
      value: ordersToday,
      currency: null,
      deltaPct: pctChange(
        ordersToday,
        sum(days.yesterday, (d) => d.orders),
      ),
      sparkline: days.spark.map((d) => sum(d, (m) => m.orders)),
    },
    {
      key: 'conversionRate',
      value: Number(convToday.toFixed(5)),
      currency: null,
      deltaPct: pctChange(convToday, conversionOn(markets, days.yesterday, now)),
      sparkline: days.spark.map((d) => conversionOn(markets, d, now)),
    },
    {
      key: 'activeUsers',
      value: usersToday,
      currency: null,
      deltaPct: pctChange(
        usersToday,
        sum(days.yesterday, (d) => d.activeUsers),
      ),
      sparkline: days.spark.map((d) => sum(d, (m) => m.activeUsers)),
    },
  ]
}
