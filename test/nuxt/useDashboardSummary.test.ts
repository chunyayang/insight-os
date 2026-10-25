import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { useDashboardSummary } from '../../app/composables/queries/useDashboardQuery'
import { useAuthStore } from '../../app/stores/auth'
import { useFiltersStore } from '../../app/stores/filters'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { ApiResponse, DashboardSummary, UserSettings } from '../../app/types/api'
import { withNuxtContext } from './support/context'

const summaryMarkets: string[] = []
registerEndpoint('/api/dashboard/summary', (event: { path: string }) => {
  summaryMarkets.push(new URL(event.path, 'http://x').searchParams.get('market') ?? '')
  return { data: { kpis: [], alerts: [] } } as unknown as ApiResponse<DashboardSummary>
})

let savedMarket: UserSettings['defaultMarket'] = 'All'
registerEndpoint('/api/settings/me', (): ApiResponse<UserSettings> => ({
  data: { defaultMarket: savedMarket },
}))

const Probe = defineComponent({
  setup() {
    useDashboardSummary()
    return () => h('div')
  },
})

// After mount, for the reason SettingsGeneral.test.ts gives.
function signIn() {
  useAuthStore().signIn({
    token: 'demo.viewer.stamp',
    user: { id: 'u-003', name: 'Test User', email: 't@x.com', role: 'viewer' },
  })
}

describe('useDashboardSummary', () => {
  let unmount = () => {}

  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    useAuthStore().signOut()
    summaryMarkets.length = 0
    savedMarket = 'All'
  })

  afterEach(() => unmount())

  async function mountProbe(route?: string) {
    const wrapper = await mountSuspended(Probe, route ? { route } : {})
    unmount = () => wrapper.unmount()
  }

  it("scopes to the user's default market once their settings arrive, and never fetches All first", async () => {
    savedMarket = 'JP'
    await mountProbe()
    signIn()

    await vi.waitFor(() => expect(summaryMarkets).toEqual(['JP']))
  })

  it('follows a change to the default, and ignores a market picked on Customers', async () => {
    await mountProbe()
    signIn()
    await vi.waitFor(() => expect(summaryMarkets).toEqual(['All']))

    usePreferencesStore().setDefaultMarket('DE')
    await vi.waitFor(() => expect(summaryMarkets.at(-1)).toBe('DE'))

    const before = summaryMarkets.length
    useFiltersStore().setMarket('TW')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(summaryMarkets).toHaveLength(before)
  })

  it('takes no market from the URL', async () => {
    savedMarket = 'US'
    await mountProbe('/?market=TW')
    signIn()

    await vi.waitFor(() => expect(summaryMarkets.at(-1)).toBe('US'))
    expect(summaryMarkets).not.toContain('TW')
  })
})
