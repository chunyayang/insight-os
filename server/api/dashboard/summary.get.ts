import type {
  AnomalyAlert,
  ApiResponse,
  DashboardSummary,
  KpiMetric,
  MarketCode,
  Money,
} from '../../../app/types/api'

/**
 * Dashboard KPIs + anomaly alerts + AI daily summary.
 *
 * Monetary KPIs carry a full `Money` map (all four currencies, each aggregated
 * server-side from daily-converted amounts) plus FxProvenance for audit — the client
 * only picks a key to display and never converts.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<DashboardSummary>> => {
  const query = getQuery(event)
  const marketParam = (query.market as string) || 'All'
  const markets: MarketCode[] =
    marketParam === 'All'
      ? MARKETS
      : ([marketParam] as MarketCode[]).filter((m) => MARKETS.includes(m))
  const activeMarkets = markets.length ? markets : MARKETS

  await mockLatency('dashboard-summary')

  const today = new Date()
  // Today vs. yesterday, and a 14-day tail for the KPI sparklines.
  const { days } = resolveRange({ range: '30d' }, today)
  const todayIso = days.at(-1)!
  const yesterdayIso = days.at(-2)!
  const sparkDays = days.slice(-14)

  function sumRevenue(date: string): Money {
    return roundMoney(sumMoney(activeMarkets.map((m) => dailyRevenueMoney(m, date, today))))
  }

  function sumMetric(date: string, pick: (m: MarketCode) => number): number {
    return activeMarkets.reduce((total, m) => total + pick(m), 0)
  }

  const revenueToday = sumRevenue(todayIso)
  const revenueYesterday = sumRevenue(yesterdayIso)

  const ordersToday = sumMetric(todayIso, (m) => dailyMetrics(m, todayIso, today).orders)
  const ordersYesterday = sumMetric(
    yesterdayIso,
    (m) => dailyMetrics(m, yesterdayIso, today).orders,
  )

  const usersToday = sumMetric(todayIso, (m) => dailyMetrics(m, todayIso, today).activeUsers)
  const usersYesterday = sumMetric(
    yesterdayIso,
    (m) => dailyMetrics(m, yesterdayIso, today).activeUsers,
  )

  // Conversion rate is an average across markets, not a sum.
  const convToday =
    activeMarkets.reduce((t, m) => t + dailyMetrics(m, todayIso, today).conversionRate, 0) /
    activeMarkets.length
  const convYesterday =
    activeMarkets.reduce((t, m) => t + dailyMetrics(m, yesterdayIso, today).conversionRate, 0) /
    activeMarkets.length

  const delta = (current: number, previous: number) =>
    previous === 0 ? 0 : Number(((current - previous) / previous).toFixed(4))

  const kpis: KpiMetric[] = [
    {
      key: 'revenue',
      value: revenueToday,
      // Delta is computed once in USD so it reads identically in every display
      // currency — a currency switch must never appear to change performance.
      deltaPct: delta(revenueToday.USD, revenueYesterday.USD),
      sparkline: sparkDays.map((d) => sumRevenue(d).USD),
    },
    {
      key: 'orders',
      value: ordersToday,
      deltaPct: delta(ordersToday, ordersYesterday),
      sparkline: sparkDays.map((d) => sumMetric(d, (m) => dailyMetrics(m, d, today).orders)),
    },
    {
      key: 'conversionRate',
      value: Number(convToday.toFixed(5)),
      deltaPct: delta(convToday, convYesterday),
      sparkline: sparkDays.map(
        (d) =>
          activeMarkets.reduce((t, m) => t + dailyMetrics(m, d, today).conversionRate, 0) /
          activeMarkets.length,
      ),
    },
    {
      key: 'activeUsers',
      value: usersToday,
      deltaPct: delta(usersToday, usersYesterday),
      sparkline: sparkDays.map((d) => sumMetric(d, (m) => dailyMetrics(m, d, today).activeUsers)),
    },
  ]

  const alerts: AnomalyAlert[] = buildAlerts(activeMarkets, today)

  return ok({
    date: todayIso,
    kpis,
    alerts,
    aiSummary: {
      text: buildAiSummary(activeMarkets, today),
      generatedAt: new Date().toISOString(),
    },
    fx: fxProvenance(days[0]!, todayIso),
  })
})
