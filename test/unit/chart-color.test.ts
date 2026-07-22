import { describe, expect, it } from 'vitest'
import { withAlpha } from '../../app/composables/useChartTheme'
import { MARKET_CHART_INDEX, chartTokenForMarket } from '../../app/constants/markets'

describe('chart colour helpers', () => {
  it('converts a resolved hex token to rgba', () => {
    // color-mix() is not reliably parsed for canvas fillStyle, so charts need rgba().
    expect(withAlpha('#5daeea', 0.18)).toBe('rgba(93, 174, 234, 0.18)')
    expect(withAlpha('5daeea', 1)).toBe('rgba(93, 174, 234, 1)')
  })

  it('passes through anything that is not 6-digit hex', () => {
    // Some tokens are authored as rgba() in dark mode; leave them alone.
    expect(withAlpha('rgba(16, 185, 129, .14)', 0.5)).toBe('rgba(16, 185, 129, .14)')
    expect(withAlpha('', 0.5)).toBe('')
  })

  it('gives each market a stable ramp token', () => {
    expect(chartTokenForMarket('US')).toBe(`var(--chart-${MARKET_CHART_INDEX.US})`)
    expect(chartTokenForMarket('JP')).toBe(`var(--chart-${MARKET_CHART_INDEX.JP})`)
    // Distinct markets never collide on a colour.
    const tokens = (['US', 'JP', 'TW', 'DE'] as const).map(chartTokenForMarket)
    expect(new Set(tokens).size).toBe(4)
  })
})
