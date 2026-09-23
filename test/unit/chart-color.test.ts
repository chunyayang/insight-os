import { describe, expect, it } from 'vitest'
import { MARKETS, MARKET_COLOR } from '../../app/constants/markets'

describe('chart colour helpers', () => {
  it('keeps every market colour 6-digit hex', () => {
    // The regression this guards: zrender's color parser only understands
    // hex/rgb()/hsl()/the named-color table — Nuxt UI's tokens are oklch(), which it
    // cannot resolve at all.
    for (const market of MARKETS) {
      for (const scheme of ['light', 'dark'] as const) {
        expect(MARKET_COLOR[market][scheme]).toMatch(/^#[0-9a-f]{6}$/i)
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
