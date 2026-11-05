import type {
  AnomalyAlert,
  ApiResponse,
  DashboardSummary,
  KpiMetric,
  MarketCode,
} from '../../../app/types/api'

/**
 * Dashboard KPIs + anomaly alerts + AI daily summary, the summary in the request's `locale`.
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
  const locale = requireLocale(query.locale)

  await mockLatency('dashboard-summary')

  const today = new Date()
  // Today vs. yesterday, and a 14-day tail for the KPI sparklines.
  const { days } = resolveRange({ range: '30d' }, today)
  const todayIso = days.at(-1)!
  const yesterdayIso = days.at(-2)!
  const sparkDays = days.slice(-14)

  function sumMetric(date: string, pick: (m: MarketCode) => number): number {
    return activeMarkets.reduce((total, m) => total + pick(m), 0)
  }

  const revenueToday = revenueOn(activeMarkets, todayIso, today)
  const revenueYesterday = revenueOn(activeMarkets, yesterdayIso, today)

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

  const convToday = conversionOn(activeMarkets, todayIso, today)
  const convYesterday = conversionOn(activeMarkets, yesterdayIso, today)

  const kpis: KpiMetric[] = [
    {
      key: 'revenue',
      value: revenueToday,
      // Delta is computed once in USD so it reads identically in every display
      // currency — a currency switch must never appear to change performance.
      deltaPct: pctChange(revenueToday.USD, revenueYesterday.USD),
      sparkline: sparkDays.map((d) => revenueOn(activeMarkets, d, today).USD),
    },
    {
      key: 'orders',
      value: ordersToday,
      deltaPct: pctChange(ordersToday, ordersYesterday),
      sparkline: sparkDays.map((d) => sumMetric(d, (m) => dailyMetrics(m, d, today).orders)),
    },
    {
      key: 'conversionRate',
      value: Number(convToday.toFixed(5)),
      deltaPct: pctChange(convToday, convYesterday),
      sparkline: sparkDays.map((d) => conversionOn(activeMarkets, d, today)),
    },
    {
      key: 'activeUsers',
      value: usersToday,
      deltaPct: pctChange(usersToday, usersYesterday),
      sparkline: sparkDays.map((d) => sumMetric(d, (m) => dailyMetrics(m, d, today).activeUsers)),
    },
  ]

  const alerts: AnomalyAlert[] = buildAlerts(activeMarkets, today)

  return ok({
    date: todayIso,
    kpis,
    alerts,
    aiSummary: {
      text: buildAiSummary(activeMarkets, locale, today),
      generatedAt: new Date().toISOString(),
    },
    fx: fxProvenance(days[0]!, todayIso),
  })
})
