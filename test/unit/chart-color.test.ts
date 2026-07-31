import { describe, expect, it } from 'vitest'
import { withAlpha } from '../../app/composables/useChartTheme'
import { MARKETS, MARKET_COLOR } from '../../app/constants/markets'

describe('chart colour helpers', () => {
  it('converts a resolved hex token to rgba', () => {
    // color-mix() is not reliably parsed for canvas fillStyle, so charts need rgba().
    expect(withAlpha('#5daeea', 0.18)).toBe('rgba(93, 174, 234, 0.18)')
    expect(withAlpha('5daeea', 1)).toBe('rgba(93, 174, 234, 1)')
  })

  it('passes through anything that is not 6-digit hex', () => {
    expect(withAlpha('rgba(16, 185, 129, .14)', 0.5)).toBe('rgba(16, 185, 129, .14)')
    expect(withAlpha('', 0.5)).toBe('')
  })

  it('keeps every market colour 6-digit hex so alpha fills work', () => {
    // The regression this guards: Nuxt UI's tokens are oklch(), which withAlpha passes
    // through unfaded — every area fill would silently render fully opaque.
    for (const market of MARKETS) {
      for (const scheme of ['light', 'dark'] as const) {
        const color = MARKET_COLOR[market][scheme]
        expect(color).toMatch(/^#[0-9a-f]{6}$/i)
        expect(withAlpha(color, 0.18)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.18\)$/)
      }
    }
  })

  it('gives each market a distinct colour in both themes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const colors = MARKETS.map((market) => MARKET_COLOR[market][scheme])
      expect(new Set(colors).size).toBe(MARKETS.length)
    }
  })
})
