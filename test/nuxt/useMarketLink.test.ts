import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useMarketLink } from '../../app/composables/useMarketLink'
import { useFiltersStore } from '../../app/stores/filters'
import type { MarketFilter } from '../../app/constants/markets'

const stubRoute = vi.hoisted(() => ({
  value: { path: '/', query: {} as Record<string, string> },
}))

mockNuxtImport('useRoute', () => () => stubRoute.value)

/** Put the user on a page, then build links from there. */
function browsing(path: string, query: Record<string, string> = {}) {
  stubRoute.value = { path, query }
  return useMarketLink()
}

function withDefaultMarket(market: MarketFilter) {
  useFiltersStore().setDefaultMarket(market)
}

describe('useMarketLink — market scope survives ordinary navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('carries the current market to a page that has its own market control', () => {
    const link = browsing('/analytics', { market: 'JP' })
    expect(link('/customers')).toEqual({ path: '/customers', query: { market: 'JP' } })
    expect(link('/campaigns')).toEqual({ path: '/campaigns', query: { market: 'JP' } })
    expect(link('/ai-assistant')).toEqual({ path: '/ai-assistant', query: { market: 'JP' } })
  })

  it('never puts a market param on the Dashboard', () => {
    const link = browsing('/analytics', { market: 'JP' })
    expect(link('/')).toBe('/')
  })

  it('leaves pages that filter nothing by market as bare paths', () => {
    const link = browsing('/analytics', { market: 'JP' })
    expect(link('/settings')).toBe('/settings')
    expect(link('/team')).toBe('/team')
    expect(link('/notifications')).toBe('/notifications')
  })

  it('omits the param when the market is already the session default', () => {
    withDefaultMarket('JP')
    const link = browsing('/analytics', { market: 'JP' })
    // Nothing to carry: /customers resolves JP from the default on its own.
    expect(link('/customers')).toBe('/customers')
  })

  it('carries a market that differs from a non-All session default', () => {
    withDefaultMarket('JP')
    const link = browsing('/analytics', { market: 'US' })
    expect(link('/customers')).toEqual({ path: '/customers', query: { market: 'US' } })
  })

  it('forwards nothing when the page carries no market of its own', () => {
    const link = browsing('/analytics')
    expect(link('/customers')).toBe('/customers')
  })

  it('refuses to forward a market the allow-list does not recognise', () => {
    const link = browsing('/analytics', { market: 'XX' })
    expect(link('/customers')).toBe('/customers')
  })

  it('ignores a param hand-typed onto a page not entitled to one', () => {
    const link = browsing('/settings', { market: 'JP' })
    expect(link('/customers')).toBe('/customers')
  })
})
