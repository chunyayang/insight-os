import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { createError } from 'h3'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { UApp } from '#components'
import DefaultLayout from '../../app/layouts/default.vue'
import { DEFAULT_CURRENCY } from '../../app/constants/markets'
import { useAuthStore } from '../../app/stores/auth'
import { useOrganizationStore } from '../../app/stores/organization'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { ApiResponse, OrgSettings, UserSettings } from '../../app/types/api'
import { withNuxtContext } from './support/context'

// Each settings read is held until released, so a test can let one land before the other.
const held = new Map<'me' | 'org', () => void>()
const hold = (name: 'me' | 'org') => new Promise<void>((resolve) => held.set(name, resolve))
/** Answers that read once it has arrived; `timeout` covers a retry's delay. */
async function release(name: 'me' | 'org', timeout?: number) {
  await vi.waitFor(() => expect(held.has(name)).toBe(true), { timeout })
  held.get(name)!()
  held.delete(name)
}
let orgFails = false
let orgReads = 0
registerEndpoint('/api/settings/me', async (): Promise<ApiResponse<UserSettings>> => {
  await hold('me')
  return { data: { defaultMarket: 'TW' } }
})
registerEndpoint('/api/settings/org', async (): Promise<ApiResponse<OrgSettings>> => {
  orgReads++
  await hold('org')
  if (orgFails) throw createError({ statusCode: 500, data: { error: { code: 'INTERNAL' } } })
  return { data: { presentationCurrency: 'JPY' } }
})

// What the page saw of the session defaults when it first rendered.
let pageSaw: { market: string; currency: string } | undefined
const Page = defineComponent({
  setup() {
    pageSaw = {
      market: usePreferencesStore().defaultMarket,
      currency: useOrganizationStore().presentationCurrency,
    }
    return () => h('p', { id: 'page' })
  },
})

// The shell's tooltips and menus need the provider context UApp sets up at the app root.
const Shell = defineComponent({
  setup: () => () => h(UApp, () => h(DefaultLayout, null, { default: () => h(Page) })),
})

// After mount, for the reason SettingsGeneral.test.ts gives.
function signIn() {
  useAuthStore().signIn({
    token: 'demo.analyst.stamp',
    user: { id: 'u-002', name: 'Test User', email: 't@x.com', role: 'analyst' },
  })
}

describe('default layout', () => {
  let unmount = () => {}

  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    useAuthStore().signOut()
    useOrganizationStore().setPresentationCurrency(DEFAULT_CURRENCY)
    usePreferencesStore().setDefaultMarket('All')
    held.clear()
    pageSaw = undefined
    orgFails = false
    orgReads = 0
  })

  afterEach(() => {
    held.forEach((resolve) => resolve())
    unmount()
  })

  async function mountShell() {
    const wrapper = await mountSuspended(Shell)
    unmount = () => wrapper.unmount()
    return wrapper
  }

  it('renders the page only once both settings have arrived, with them in the stores', async () => {
    const wrapper = await mountShell()
    signIn()

    await release('me')
    await vi.waitFor(() => expect(usePreferencesStore().defaultMarket).toBe('TW'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(wrapper.find('#page').exists()).toBe(false)

    await release('org')
    await vi.waitFor(() => expect(wrapper.find('#page').exists()).toBe(true))
    expect(pageSaw).toEqual({ market: 'TW', currency: 'JPY' })
  })

  it('retries a failed settings load once, then renders the page on the fallbacks', async () => {
    orgFails = true
    const wrapper = await mountShell()
    signIn()

    await release('me')
    await release('org')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(wrapper.find('#page').exists()).toBe(false)

    // The retry comes after Vue Query's 1s delay.
    await release('org', 2000)
    await vi.waitFor(() => expect(wrapper.find('#page').exists()).toBe(true))
    expect(orgReads).toBe(2)
    expect(pageSaw).toEqual({ market: 'TW', currency: DEFAULT_CURRENCY })
  })
})
