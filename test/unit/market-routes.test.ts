import { describe, expect, it } from 'vitest'
import {
  MARKET_SCOPED_ROUTES,
  NAV_GROUPS,
  acceptsMarketParam,
} from '../../app/constants/navigation'

const navPaths = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.to))

describe('acceptsMarketParam — which pages a market param is legible on', () => {
  it('accepts the pages that own a market control', () => {
    expect(acceptsMarketParam('/analytics')).toBe(true)
    expect(acceptsMarketParam('/ai-assistant')).toBe(true)
    expect(acceptsMarketParam('/customers')).toBe(true)
    expect(acceptsMarketParam('/campaigns')).toBe(true)
  })

  it('refuses the Dashboard, whose market scopes are the KPI default and the chart tabs', () => {
    expect(acceptsMarketParam('/')).toBe(false)
  })

  it('refuses pages that filter nothing by market', () => {
    expect(acceptsMarketParam('/settings')).toBe(false)
    expect(acceptsMarketParam('/team')).toBe(false)
    expect(acceptsMarketParam('/notifications')).toBe(false)
    expect(acceptsMarketParam('/data-sources')).toBe(false)
  })

  it('matches exactly, so a detail route does not inherit its list page entitlement', () => {
    expect(acceptsMarketParam('/customers/c-1')).toBe(false)
    expect(acceptsMarketParam('/analytics/revenue')).toBe(false)
  })

  it('pins every scoped route to a real nav destination, so a typo cannot go unnoticed', () => {
    for (const path of MARKET_SCOPED_ROUTES) {
      expect(navPaths).toContain(path)
    }
  })
})
