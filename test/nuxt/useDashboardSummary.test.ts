import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { dashboardKeys, useDashboardSummary } from '../../app/composables/queries/useDashboardQuery'
import { useFiltersStore } from '../../app/stores/filters'
import { usePreferencesStore } from '../../app/stores/preferences'
import { useOrganizationStore } from '../../app/stores/organization'
import type { MarketFilter } from '../../app/constants/markets'
import type { ApiResponse, CurrencyCode, DashboardSummary } from '../../app/types/api'
import { withNuxtContext } from './support/context'

const summaryMarkets: string[] = []
const summaryCurrencies: string[] = []
registerEndpoint('/api/dashboard/summary', (event: { path: string }) => {
  const params = new URL(event.path, 'http://x').searchParams
  summaryMarkets.push(params.get('market') ?? '')
  summaryCurrencies.push(params.get('presentationCurrency') ?? '')
  return { data: { kpis: [], alerts: [] } } as unknown as ApiResponse<DashboardSummary>
})

// Seeds the store in setup, as the layout has by the time any page mounts. Seeding it from
// the test body would reach a different Pinia instance (SettingsGeneral.test.ts says why).
const Probe = defineComponent({
  props: {
    market: { type: String as () => MarketFilter, default: 'All' },
    currency: { type: String as () => CurrencyCode, default: 'USD' },
  },
  setup(props) {
    usePreferencesStore().setDefaultMarket(props.market)
    useOrganizationStore().setPresentationCurrency(props.currency)
    useDashboardSummary()
    return () => h('div')
  },
})

describe('useDashboardSummary', () => {
  let unmount = () => {}

  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    summaryMarkets.length = 0
    summaryCurrencies.length = 0
  })

  afterEach(() => unmount())

  async function mountProbe(market: MarketFilter, route?: string, currency?: CurrencyCode) {
    const wrapper = await mountSuspended(Probe, {
      props: { market, ...(currency ? { currency } : {}) },
      ...(route ? { route } : {}),
    })
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

  it("sends the organization's presentation currency", async () => {
    await mountProbe('All', undefined, 'EUR')

    await vi.waitFor(() => expect(summaryCurrencies).toEqual(['EUR']))
  })

  it('refetches when the presentation currency changes', async () => {
    await mountProbe('All', undefined, 'USD')
    await vi.waitFor(() => expect(summaryCurrencies).toEqual(['USD']))

    useOrganizationStore().setPresentationCurrency('JPY')
    await vi.waitFor(() => expect(summaryCurrencies.at(-1)).toBe('JPY'))
  })

  it('refetches an older entry with the currency in its key, not the one now in the store', async () => {
    await mountProbe('All', undefined, 'USD')
    await vi.waitFor(() => expect(summaryCurrencies).toEqual(['USD']))
    useOrganizationStore().setPresentationCurrency('JPY')
    await vi.waitFor(() => expect(summaryCurrencies.at(-1)).toBe('JPY'))

    // The USD entry is inactive now; refetching it must not fill it with JPY figures.
    await withNuxtContext(() =>
      useQueryClient().refetchQueries({
        queryKey: dashboardKeys.summary('All', 'en', 'USD'),
        type: 'all',
      }),
    )
    expect(summaryCurrencies.at(-1)).toBe('USD')
  })
})
