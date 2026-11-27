import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { useAuth } from '../../app/composables/useAuth'
import { dashboardKeys, useDashboardSummary } from '../../app/composables/queries/useDashboardQuery'
import { orgSettingsKeys } from '../../app/composables/queries/useOrgSettingsQuery'
import { userSettingsKeys } from '../../app/composables/queries/useUserSettingsQuery'
import { useAuthStore } from '../../app/stores/auth'
import type { ApiResponse, DashboardSummary, Role } from '../../app/types/api'
import { withNuxtContext } from './support/context'
import { seedOrgSettings, seedUserSettings } from './support/settings'

// Catches only the page load that leaves the app; the role switch's in-app navigation is real.
const { leaveApp } = vi.hoisted(() => ({ leaveApp: vi.fn() }))
mockNuxtImport(
  navigateTo,
  (original) =>
    (...args: Parameters<typeof original>) =>
      args[1]?.external ? leaveApp(...args) : original(...args),
)

let summaryRequests = 0
registerEndpoint('/api/dashboard/summary', () => {
  summaryRequests++
  return { data: { kpis: [], alerts: [] } } as unknown as ApiResponse<DashboardSummary>
})

const USER_ID = 'u-1'
const DATA_KEY = dashboardKeys.summary('All', 'en', 'USD')

let auth: ReturnType<typeof useAuth>
const Probe = defineComponent({
  props: { withDashboard: Boolean },
  setup(props) {
    auth = useAuth()
    if (props.withDashboard) useDashboardSummary()
    return () => h('div')
  },
})

function signInAs(role: Role) {
  useAuthStore().signIn({
    token: `demo.${role}`,
    user: { id: USER_ID, name: 'Test User', email: 't@x.com', role },
  })
}

const queryClient = () => withNuxtContext(() => useQueryClient())

describe('useAuth', () => {
  let unmount = () => {}

  beforeEach(() => {
    queryClient().clear()
    leaveApp.mockReset()
    summaryRequests = 0
  })

  afterEach(() => {
    unmount()
    useAuthStore().signOut()
  })

  async function mountProbe(route = '/', withDashboard = false) {
    const wrapper = await mountSuspended(Probe, { route, props: { withDashboard } })
    unmount = () => wrapper.unmount()
  }

  describe('signOut', () => {
    it('loads /login as a new page once the session cookies are gone', async () => {
      signInAs('admin')
      await mountProbe()
      let cookiesAtLeave = ''
      leaveApp.mockImplementation(() => (cookiesAtLeave = document.cookie))

      await auth.signOut()

      expect(leaveApp).toHaveBeenCalledWith('/login', { external: true })
      // happy-dom lists a deleted cookie with an empty value rather than dropping it.
      expect(cookiesAtLeave).not.toMatch(/insight-token=[^;]/)
      expect(cookiesAtLeave).not.toMatch(/insight-session=[^;]/)
    })
  })

  describe('switchRole', () => {
    function seedSession() {
      seedOrgSettings({ presentationCurrency: 'EUR' })
      seedUserSettings({ defaultMarket: 'All' }, USER_ID)
    }

    it('keeps the org and user settings', async () => {
      signInAs('admin')
      seedSession()
      await mountProbe()

      await auth.switchRole('analyst')

      expect(queryClient().getQueryData(orgSettingsKeys.all)).toEqual({
        presentationCurrency: 'EUR',
      })
      expect(queryClient().getQueryData(userSettingsKeys.me(USER_ID))).toEqual({
        defaultMarket: 'All',
      })
    })

    it("empties every other entry, so no page renders the previous role's data", async () => {
      signInAs('admin')
      seedSession()
      queryClient().setQueryData(DATA_KEY, { kpis: [], alerts: [] })
      await mountProbe()

      await auth.switchRole('analyst')

      expect(queryClient().getQueryData(DATA_KEY)).toBeUndefined()
    })

    it('refetches the data on screen', async () => {
      signInAs('admin')
      seedSession()
      await mountProbe('/', true)
      await vi.waitFor(() => expect(summaryRequests).toBe(1))

      await auth.switchRole('analyst')

      expect(summaryRequests).toBe(2)
    })

    it("leaves a page the new role can't open", async () => {
      signInAs('admin')
      seedSession()
      await mountProbe('/team')

      await auth.switchRole('viewer')

      expect(useRouter().currentRoute.value.path).toBe('/')
    })

    it('stays on a page the new role can open, with its query', async () => {
      signInAs('admin')
      seedSession()
      await mountProbe('/analytics?market=JP')

      await auth.switchRole('analyst')

      const { path, query } = useRouter().currentRoute.value
      expect(path).toBe('/analytics')
      expect(query).toEqual({ market: 'JP' })
    })

    it('does nothing when the role is already active', async () => {
      signInAs('admin')
      seedSession()
      queryClient().setQueryData(DATA_KEY, { kpis: [], alerts: [] })
      await mountProbe()

      await auth.switchRole('admin')

      expect(queryClient().getQueryData(DATA_KEY)).toEqual({ kpis: [], alerts: [] })
    })
  })
})
