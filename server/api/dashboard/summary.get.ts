import type {
  AnomalyAlert,
  ApiResponse,
  DashboardSummary,
  MarketCode,
} from '../../../app/types/api'

/**
 * Dashboard KPIs + anomaly alerts + AI daily summary, the text in the request's `locale`.
 *
 * Monetary KPIs carry a full `Money` map (all four currencies, each aggregated
 * server-side from daily-converted amounts) plus FxProvenance for audit — the client
 * only picks a key to display and never converts. At single-market scope they also
 * declare the market's `functionalCurrency`, which the client reads rather than derives.
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
  // Today vs. yesterday, and a 7-day tail for the KPI sparklines: one weekly cycle, read at a glance.
  const { days } = resolveRange({ range: '30d' }, today)
  const todayIso = days.at(-1)!
  const kpis = buildKpis(
    activeMarkets,
    { today: todayIso, yesterday: days.at(-2)!, spark: days.slice(-7) },
    today,
  )

  const alerts: AnomalyAlert[] = buildAlerts(activeMarkets, locale, today)

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
