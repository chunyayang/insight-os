import { describe, expect, it } from 'vitest'
import { buildKpis } from '../../server/utils/mock/kpis'
import { MARKETS, pctChange, revenueOn } from '../../server/utils/mock/markets'
import type { MarketCode, Money } from '../../app/types/api'

const now = new Date('2026-03-30T00:00:00Z')
const days = {
  today: '2026-03-30',
  yesterday: '2026-03-29',
  spark: [
    '2026-03-24',
    '2026-03-25',
    '2026-03-26',
    '2026-03-27',
    '2026-03-28',
    '2026-03-29',
    '2026-03-30',
  ],
}
const revenueKpi = (markets: MarketCode[]) =>
  buildKpis(markets, days, now).find((k) => k.key === 'revenue')!

describe('Dashboard KPIs', () => {
  it.each([
    ['JP', 'JPY'],
    ['TW', 'TWD'],
    ['DE', 'EUR'],
    ['US', 'USD'],
  ] as const)('declares %s revenue in its functional currency, %s', (market, currency) => {
    expect(revenueKpi([market]).functionalCurrency).toBe(currency)
  })

  it('computes a single market’s revenue delta and sparkline in its functional currency', () => {
    const kpi = revenueKpi(['JP'])
    const jpy = (d: string) => revenueOn(['JP'], d, now).JPY

    expect(kpi.deltaPct).toBe(pctChange(jpy(days.today), jpy(days.yesterday)))
    expect(kpi.sparkline).toEqual(days.spark.map(jpy))
    // The sparkline ends on the amount the card shows.
    expect(kpi.sparkline.at(-1)).toBe((kpi.value as Money).JPY)
  })

  it('keeps an `All` revenue KPI in USD, declaring no functional currency', () => {
    const kpi = revenueKpi(MARKETS)
    const usd = (d: string) => revenueOn(MARKETS, d, now).USD

    expect(kpi.functionalCurrency).toBeNull()
    expect(kpi.deltaPct).toBe(pctChange(usd(days.today), usd(days.yesterday)))
    expect(kpi.sparkline).toEqual(days.spark.map(usd))
  })

  it('declares no currency on a count or a rate, even for one market', () => {
    const others = buildKpis(['JP'], days, now).filter((k) => k.key !== 'revenue')

    expect(others.map((k) => k.functionalCurrency)).toEqual([null, null, null])
  })
})
