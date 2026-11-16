import { describe, expect, it } from 'vitest'
import { buildKpis } from '../../server/utils/mock/kpis'
import { MARKETS, pctChange, revenueOn } from '../../server/utils/mock/markets'
import type { CurrencyCode, MarketCode } from '../../app/types/api'

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
const revenueKpi = (markets: MarketCode[], presentationCurrency: CurrencyCode = 'USD') =>
  buildKpis(markets, presentationCurrency, days, now).find((k) => k.key === 'revenue')!

describe('Dashboard KPIs', () => {
  it.each([
    ['JP', 'JPY'],
    ['TW', 'TWD'],
    ['DE', 'EUR'],
    ['US', 'USD'],
  ] as const)('declares %s revenue in its functional currency, %s', (market, currency) => {
    expect(revenueKpi([market], 'EUR').currency).toBe(currency)
  })

  it('computes a single market’s revenue delta and sparkline in its functional currency', () => {
    const kpi = revenueKpi(['JP'])
    const jpy = (d: string) => revenueOn(['JP'], d, now).JPY

    expect(kpi.deltaPct).toBe(pctChange(jpy(days.today), jpy(days.yesterday)))
    expect(kpi.value).toBe(jpy(days.today))
    expect(kpi.sparkline).toEqual(days.spark.map(jpy))
    // The sparkline ends on the amount the card shows.
    expect(kpi.sparkline.at(-1)).toBe(kpi.value)
  })

  it('ignores the presentation currency for a single market', () => {
    expect(revenueKpi(['JP'], 'EUR')).toEqual(revenueKpi(['JP'], 'USD'))
  })

  it.each(['USD', 'EUR', 'JPY', 'TWD'] as const)(
    'returns an `All` revenue KPI in the presentation currency, %s',
    (currency) => {
      const kpi = revenueKpi(MARKETS, currency)
      const amount = (d: string) => revenueOn(MARKETS, d, now)[currency]

      expect(kpi.currency).toBe(currency)
      expect(kpi.value).toBe(amount(days.today))
      expect(kpi.deltaPct).toBe(pctChange(amount(days.today), amount(days.yesterday)))
      expect(kpi.sparkline).toEqual(days.spark.map(amount))
      expect(kpi.sparkline.at(-1)).toBe(kpi.value)
    },
  )

  it('gives a different `All` delta per presentation currency, since daily rates differ', () => {
    expect(revenueKpi(MARKETS, 'EUR').deltaPct).not.toBe(revenueKpi(MARKETS, 'USD').deltaPct)
  })

  it('declares no currency on a count or a rate, even for one market', () => {
    const others = buildKpis(['JP'], 'USD', days, now).filter((k) => k.key !== 'revenue')

    expect(others.map((k) => k.currency)).toEqual([null, null, null])
  })
})
