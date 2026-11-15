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
 * At `All`, the revenue delta, sparkline and AI summary are computed in the request's
 * `presentationCurrency`, the currency the card shows.
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
  const presentationCurrency = requirePresentationCurrency(query.presentationCurrency)

  await mockLatency('dashboard-summary')

  const today = new Date()
  // Today vs. yesterday, and a 7-day tail for the KPI sparklines: one weekly cycle, read at a glance.
  const { days } = resolveRange({ range: '30d' }, today)
  const todayIso = days.at(-1)!
  const kpis = buildKpis(
    activeMarkets,
    presentationCurrency,
    { today: todayIso, yesterday: days.at(-2)!, spark: days.slice(-7) },
    today,
  )

  const alerts: AnomalyAlert[] = buildAlerts(activeMarkets, locale, today)

  return ok({
    date: todayIso,
    kpis,
    alerts,
    aiSummary: {
      text: buildAiSummary(activeMarkets, locale, presentationCurrency, today),
      generatedAt: new Date().toISOString(),
    },
    fx: fxProvenance(days[0]!, todayIso),
  })
})
