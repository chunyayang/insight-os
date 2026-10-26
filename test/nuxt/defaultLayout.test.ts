import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { UApp } from '#components'
import DefaultLayout from '../../app/layouts/default.vue'
import { useAuthStore } from '../../app/stores/auth'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { ApiResponse, OrgSettings, UserSettings } from '../../app/types/api'

registerEndpoint('/api/settings/me', (): ApiResponse<UserSettings> => ({
  data: { defaultMarket: 'TW' },
}))
registerEndpoint('/api/settings/org', (): ApiResponse<OrgSettings> => ({
  data: { presentationCurrency: 'USD' },
}))

// The shell's tooltips and menus need the provider context UApp sets up at the app root.
const Shell = defineComponent({
  setup: () => () => h(UApp, () => h(DefaultLayout)),
})

describe('default layout', () => {
  it("seeds the session's default market from the signed-in user's settings", async () => {
    await mountSuspended(Shell)
    expect(usePreferencesStore().defaultMarket).toBe('All')

    useAuthStore().signIn({
      token: 'demo.analyst.stamp',
      user: { id: 'u-002', name: 'Test User', email: 't@x.com', role: 'analyst' },
    })

    await vi.waitFor(() => expect(usePreferencesStore().defaultMarket).toBe('TW'))
  })
})
