import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { useDashboardSummary } from '../../app/composables/queries/useDashboardQuery'
import { useFiltersStore } from '../../app/stores/filters'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { MarketFilter } from '../../app/constants/markets'
import type { ApiResponse, DashboardSummary } from '../../app/types/api'
import { withNuxtContext } from './support/context'

const summaryMarkets: string[] = []
registerEndpoint('/api/dashboard/summary', (event: { path: string }) => {
  summaryMarkets.push(new URL(event.path, 'http://x').searchParams.get('market') ?? '')
  return { data: { kpis: [], alerts: [] } } as unknown as ApiResponse<DashboardSummary>
})

// Seeds the store in setup, as the layout has by the time any page mounts. Seeding it from
// the test body would reach a different Pinia instance (SettingsGeneral.test.ts says why).
const Probe = defineComponent({
  props: { market: { type: String as () => MarketFilter, default: 'All' } },
  setup(props) {
    usePreferencesStore().setDefaultMarket(props.market)
    useDashboardSummary()
    return () => h('div')
  },
})

describe('useDashboardSummary', () => {
  let unmount = () => {}

  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    summaryMarkets.length = 0
  })

  afterEach(() => unmount())

  async function mountProbe(market: MarketFilter, route?: string) {
    const wrapper = await mountSuspended(Probe, { props: { market }, ...(route ? { route } : {}) })
    unmount = () => wrapper.unmount()
  }

  it("scopes to the session's default market", async () => {
    await mountProbe('JP')

    await vi.waitFor(() => expect(summaryMarkets).toEqual(['JP']))
  })

  it('follows a change to the default', async () => {
    await mountProbe('All')
    await vi.waitFor(() => expect(summaryMarkets).toEqual(['All']))

    usePreferencesStore().setDefaultMarket('DE')
    await vi.waitFor(() => expect(summaryMarkets.at(-1)).toBe('DE'))
  })

  it('ignores a market picked on Customers', async () => {
    await mountProbe('All')
    await vi.waitFor(() => expect(summaryMarkets).toEqual(['All']))

    const before = summaryMarkets.length
    useFiltersStore().setMarket('TW')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(summaryMarkets).toHaveLength(before)
  })

  it('takes no market from the URL', async () => {
    await mountProbe('US', '/?market=TW')

    await vi.waitFor(() => expect(summaryMarkets).toEqual(['US']))
  })
})
