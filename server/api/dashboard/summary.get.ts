import type {
  AnomalyAlert,
  ApiResponse,
  DashboardSummary,
  MarketCode,
} from '../../../app/types/api'

/**
 * Dashboard KPIs, anomaly alerts and AI daily summary. The text is in `locale`; revenue is in the
 * one currency `revenueCurrency` picks for the scope, so the card and the summary always agree.
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
