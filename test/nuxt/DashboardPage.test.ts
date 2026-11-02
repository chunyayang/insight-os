import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import DashboardPage from '../../app/pages/index.vue'
import { useAuthStore } from '../../app/stores/auth'
import type {
  ApiResponse,
  DashboardSummary,
  RevenueResponse,
  UserSettings,
} from '../../app/types/api'
import { stubElementSize } from './support/layout'
import { withNuxtContext } from './support/context'

// The summary is held open until released, so a revenue request that waits on it never comes.
let releaseSummary = () => {}
registerEndpoint('/api/dashboard/summary', async () => {
  await new Promise<void>((resolve) => (releaseSummary = resolve))
  return { data: { kpis: [], alerts: [] } } as unknown as ApiResponse<DashboardSummary>
})

const revenueMarkets: string[] = []
registerEndpoint('/api/analytics/revenue', (event: { path: string }) => {
  revenueMarkets.push(new URL(event.path, 'http://x').searchParams.get('market') ?? '')
  return { data: { series: [], totalsByMarket: [] } } as unknown as ApiResponse<RevenueResponse>
})

registerEndpoint('/api/settings/me', (): ApiResponse<UserSettings> => ({
  data: { defaultMarket: 'JP' },
}))

describe('Dashboard page', () => {
  stubElementSize()
  let unmount = () => {}

  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    useAuthStore().signOut()
    revenueMarkets.length = 0
  })

  afterEach(() => {
    releaseSummary()
    unmount()
  })

  it("fetches the revenue trend beside the summary, on the user's default market", async () => {
    const wrapper = await mountSuspended(DashboardPage)
    unmount = () => wrapper.unmount()
    // After mount, for the reason SettingsGeneral.test.ts gives.
    useAuthStore().signIn({
      token: 'demo.viewer.stamp',
      user: { id: 'u-003', name: 'Test User', email: 't@x.com', role: 'viewer' },
    })

    await vi.waitFor(() => expect(revenueMarkets).toEqual(['JP']))
  })
})
