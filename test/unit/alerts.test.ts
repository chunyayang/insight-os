import { describe, expect, it } from 'vitest'
import { buildAiSummary, buildAlerts } from '../../server/utils/mock/alerts'
import {
  conversionOn,
  dailyMetrics,
  MARKETS,
  pctChange,
  revenueOn,
} from '../../server/utils/mock/markets'
import { addDays, isoDate } from '../../server/utils/mock/dates'
import { formatDelta } from '../../app/utils/format'

const today = new Date('2026-03-30T00:00:00Z')

describe('anomaly alerts', () => {
  it('raises a critical JP conversion alert derived from the seeded anomaly', () => {
    const jp = buildAlerts(MARKETS, 'en', today).find((a) => a.market === 'JP')
    expect(jp).toBeDefined()
    expect(jp!.severity).toBe('critical')
    expect(jp!.metricKey).toBe('conversionRate')

    /*
     * The headline figure must track the seeded -18%. It is computed from window
     * averages rather than two sample days, so it lands close rather than exactly;
     * a wide-but-meaningful band catches both a broken derivation (≈0%) and a
     * regression that silently drops the anomaly.
     */
    const percent = Number(jp!.message.match(/down (\d+)%/)?.[1])
    expect(percent).toBeGreaterThan(10)
    expect(percent).toBeLessThan(26)
  })

  it('writes every alert in the requested locale, with the same figures', () => {
    const figures = (message: string) => message.match(/\d+%/g)
    const en = buildAlerts(MARKETS, 'en', today)
    const zh = buildAlerts(MARKETS, 'zh-TW', today)

    expect(zh.map((a) => a.id)).toEqual(en.map((a) => a.id))
    zh.forEach((alert, i) => {
      expect(alert.message).toMatch(/\p{Script=Han}/u)
      expect(alert.message).not.toBe(en[i]!.message)
      expect(figures(alert.message)).toEqual(figures(en[i]!.message))
    })
  })

  it('only reports alerts for markets in scope', () => {
    const jpOnly = buildAlerts(['JP'], 'en', today)
    expect(jpOnly.map((a) => a.id)).toEqual(['anom_cl290f8aj0001'])

    const usOnly = buildAlerts(['US'], 'en', today)
    expect(usOnly).toEqual([])
  })

  it('covers the spec severities across the full market set', () => {
    const severities = new Set(buildAlerts(MARKETS, 'en', today).map((a) => a.severity))
    expect(severities).toContain('critical')
    expect(severities).toContain('warning')
  })

  it('emits ISO 8601 timestamps', () => {
    for (const alert of buildAlerts(MARKETS, 'en', today)) {
      expect(alert.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(Number.isNaN(Date.parse(alert.detectedAt))).toBe(false)
    }
  })
})

describe('the Dashboard story, today against yesterday', () => {
  const dates = {
    weekday: new Date('2026-11-05T12:00:00Z'),
    saturday: new Date('2026-11-07T12:00:00Z'),
    sunday: new Date('2026-11-08T12:00:00Z'),
    monday: new Date('2026-11-09T12:00:00Z'),
  }

  function change(now: Date, pick: (date: string) => number) {
    return pctChange(pick(isoDate(now)), pick(isoDate(addDays(now, -1))))
  }
  const total = (now: Date, metric: 'orders' | 'activeUsers') => (date: string) =>
    MARKETS.reduce((sum, m) => sum + dailyMetrics(m, date, now)[metric], 0)

  it.each(Object.entries(dates))(
    'revenue, orders and active users rise and conversion falls on a %s',
    (_day, now) => {
      expect(change(now, (d) => revenueOn(MARKETS, d, now).USD)).toBeGreaterThan(0.01)
      expect(change(now, total(now, 'orders'))).toBeGreaterThan(0.01)
      expect(change(now, (d) => conversionOn(MARKETS, d, now))).toBeLessThan(-0.01)
      expect(change(now, total(now, 'activeUsers'))).toBeGreaterThan(0.01)
    },
  )

  it('quotes the same revenue and conversion figures the KPI cards show', () => {
    // The card's own formatter, without its sign: the summary says "up" or "down" instead.
    const asCard = (ratio: number) => formatDelta(ratio, 'en-US').replace(/^[+-]/, '')

    for (const now of Object.values(dates)) {
      for (const scope of [MARKETS, ['US'], ['JP'], ['TW'], ['DE']] as const) {
        const markets = [...scope]
        const revenue = change(now, (d) => revenueOn(markets, d, now).USD)
        const conversion = change(now, (d) => conversionOn(markets, d, now))

        for (const locale of ['en', 'zh-TW'] as const) {
          const summary = buildAiSummary(markets, locale, now)
          expect(summary).toContain(asCard(revenue))
          expect(summary).toContain(asCard(conversion))
        }
      }
    }
  })

  it('quotes the TW figure in both the alert and the summary', () => {
    const now = dates.weekday
    const users = (d: string) => dailyMetrics('TW', d, now).activeUsers
    const percent = Math.round(change(now, users) * 100)

    expect(percent).toBeGreaterThan(0)
    const alert = buildAlerts(['TW'], 'en', now)[0]!
    expect(alert.message).toContain(`up ${percent}%`)
    expect(buildAiSummary(['TW'], 'en', now)).toContain(`${percent}%`)
    expect(buildAiSummary(['TW'], 'zh-TW', now)).toContain(`${percent}%`)
  })

  it("holds Germany's orders below yesterday, as its summary sentence says", () => {
    const now = dates.weekday
    expect(change(now, (d) => dailyMetrics('DE', d, now).orders)).toBeLessThan(0)
  })
})

describe('AI daily summary', () => {
  it('names Japan as the outlier while the anomaly is active', () => {
    expect(buildAiSummary(MARKETS, 'en', today)).toContain('Japan is the outlier')
    expect(buildAiSummary(MARKETS, 'zh-TW', today)).toContain('日本是異常市場')
  })

  it('omits the Japan narrative when JP is out of scope', () => {
    const summary = buildAiSummary(['US', 'TW'], 'en', today)
    expect(summary).not.toContain('Japan is the outlier')
    expect(summary.length).toBeGreaterThan(0)
    expect(buildAiSummary(['US', 'TW'], 'zh-TW', today)).not.toContain('日本')
  })

  it('says the same thing in every locale, sentence for sentence', () => {
    for (const markets of [MARKETS, ['US', 'TW'] as const, ['DE'] as const]) {
      const en = buildAiSummary([...markets], 'en', today).split(/(?<=\.) /)
      const zh = buildAiSummary([...markets], 'zh-TW', today).split(/(?<=。)/)
      expect(zh).toHaveLength(en.length)
    }
  })
})
