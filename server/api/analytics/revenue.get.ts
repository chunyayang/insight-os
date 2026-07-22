import type {
  ApiResponse,
  MarketCode,
  RangeToken,
  RevenueResponse,
  RevenueMarketSeries,
} from '../../../app/types/api'

/**
 * Revenue series by market. Every point carries a full `Money` map converted at THAT
 * day's official rate, so summing points reproduces the historically accurate total and
 * the client can switch display currency with no refetch.
 *
 * `range` is a data-scope param: it changes which days are aggregated (and which daily
 * rates apply), so it belongs in the query key and triggers a real refetch.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<RevenueResponse>> => {
  const query = getQuery(event)
  const range = (query.range as RangeToken) || '30d'

  const requested = (query.markets as string)?.split(',').filter(Boolean) as
    MarketCode[] | undefined
  const marketParam = (query.market as string) || 'All'
  const markets: MarketCode[] = requested?.length
    ? requested.filter((m) => MARKETS.includes(m))
    : marketParam === 'All'
      ? MARKETS
      : ([marketParam] as MarketCode[]).filter((m) => MARKETS.includes(m))

  const activeMarkets = markets.length ? markets : MARKETS

  await mockLatency('analytics-revenue')

  const today = new Date()
  const { days, from, to } = resolveRange({ range }, today)

  const series: RevenueMarketSeries[] = activeMarkets.map((market) => ({
    market,
    points: days.map((date) => ({
      t: date,
      value: dailyRevenueMoney(market, date, today),
    })),
  }))

  const totalsByMarket = series.map((s) => ({
    market: s.market,
    // Sum of daily-converted amounts — never a period total times one rate.
    total: roundMoney(sumMoney(s.points.map((p) => p.value))),
  }))

  return ok({
    fx: fxProvenance(from, to),
    series,
    totalsByMarket,
  })
})
