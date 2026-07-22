import { describe, expect, it } from 'vitest'
import { buildAiSummary, buildAlerts } from '../../server/utils/mock/alerts'
import { MARKETS } from '../../server/utils/mock/markets'

const today = new Date('2026-03-30T00:00:00Z')

describe('anomaly alerts', () => {
  it('raises a critical JP conversion alert derived from the seeded anomaly', () => {
    const jp = buildAlerts(MARKETS, today).find((a) => a.market === 'JP')
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

  it('only reports alerts for markets in scope', () => {
    const jpOnly = buildAlerts(['JP'], today)
    expect(jpOnly.map((a) => a.id)).toEqual(['alert-jp-conversion'])

    const usOnly = buildAlerts(['US'], today)
    expect(usOnly).toEqual([])
  })

  it('covers the spec severities across the full market set', () => {
    const severities = new Set(buildAlerts(MARKETS, today).map((a) => a.severity))
    expect(severities).toContain('critical')
    expect(severities).toContain('warning')
  })

  it('emits ISO 8601 timestamps', () => {
    for (const alert of buildAlerts(MARKETS, today)) {
      expect(alert.detectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(Number.isNaN(Date.parse(alert.detectedAt))).toBe(false)
    }
  })
})

describe('AI daily summary', () => {
  it('leads with Japan while the anomaly is active', () => {
    expect(buildAiSummary(MARKETS, today).startsWith('Japan is the outlier')).toBe(true)
  })

  it('omits the Japan narrative when JP is out of scope', () => {
    const summary = buildAiSummary(['US', 'TW'], today)
    expect(summary).not.toContain('Japan is the outlier')
    expect(summary.length).toBeGreaterThan(0)
  })
})
