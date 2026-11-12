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
 * The currency revenue is compared across days in: the KPI delta and sparkline, and the AI summary.
 * One market uses its own, so a rate move can't read as performance. An aggregate keeps USD,
 * whichever presentation currency renders its amount (currency-model.md §3, still open there).
 */
export function revenueComparisonCurrency(markets: MarketCode[]): CurrencyCode {
  return functionalCurrencyOf(markets) ?? 'USD'
}

/**
 * The Dashboard's four KPIs for `markets`: today compared with yesterday, each with a sparkline
 * over the `spark` days.
 */
export function buildKpis(
  markets: MarketCode[],
  days: { today: string; yesterday: string; spark: string[] },
  now = new Date(),
): KpiMetric[] {
  const sum = (date: string, pick: (m: ReturnType<typeof dailyMetrics>) => number) =>
    markets.reduce((total, m) => total + pick(dailyMetrics(m, date, now)), 0)

  const functionalCurrency = functionalCurrencyOf(markets)
  const comparisonCurrency = revenueComparisonCurrency(markets)
  const revenueToday = revenueOn(markets, days.today, now)
  const revenueYesterday = revenueOn(markets, days.yesterday, now)

  const ordersToday = sum(days.today, (d) => d.orders)
  const usersToday = sum(days.today, (d) => d.activeUsers)
  const convToday = conversionOn(markets, days.today, now)

  return [
    {
      key: 'revenue',
      value: revenueToday,
      functionalCurrency,
      deltaPct: pctChange(revenueToday[comparisonCurrency], revenueYesterday[comparisonCurrency]),
      sparkline: days.spark.map((d) => revenueOn(markets, d, now)[comparisonCurrency]),
    },
    {
      key: 'orders',
      value: ordersToday,
      functionalCurrency: null,
      deltaPct: pctChange(
        ordersToday,
        sum(days.yesterday, (d) => d.orders),
      ),
      sparkline: days.spark.map((d) => sum(d, (m) => m.orders)),
    },
    {
      key: 'conversionRate',
      value: Number(convToday.toFixed(5)),
      functionalCurrency: null,
      deltaPct: pctChange(convToday, conversionOn(markets, days.yesterday, now)),
      sparkline: days.spark.map((d) => conversionOn(markets, d, now)),
    },
    {
      key: 'activeUsers',
      value: usersToday,
      functionalCurrency: null,
      deltaPct: pctChange(
        usersToday,
        sum(days.yesterday, (d) => d.activeUsers),
      ),
      sparkline: days.spark.map((d) => sum(d, (m) => m.activeUsers)),
    },
  ]
}
