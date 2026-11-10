import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { readBody } from 'h3'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { focusManager, useQueryClient } from '@tanstack/vue-query'
import Harness from './support/SettingsGeneralHarness.vue'
import { useAuthStore } from '../../app/stores/auth'
import { useOrganizationStore } from '../../app/stores/organization'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { ApiResponse, OrgSettings, Role, UserSettings } from '../../app/types/api'
import { withNuxtContext } from './support/context'

let saved: UserSettings = { defaultMarket: 'All' }
let settingsReads = 0
// While set, a read answers with what was saved when it arrived, but only once released:
// a read that crosses a save.
let holdReads: Promise<void> | null = null
registerEndpoint('/api/me/settings', {
  method: 'GET',
  handler: async (): Promise<ApiResponse<UserSettings>> => {
    settingsReads++
    const reply = { data: { ...saved } }
    await holdReads
    return reply
  },
})
registerEndpoint('/api/me/settings', {
  method: 'PATCH',
  handler: async (event): Promise<ApiResponse<UserSettings>> => {
    saved = { ...saved, ...(await readBody<Partial<UserSettings>>(event)) }
    return { data: saved }
  },
})

let savedOrg: OrgSettings = { presentationCurrency: 'USD' }
let orgReads = 0
registerEndpoint('/api/org/settings', {
  method: 'GET',
  handler: (): ApiResponse<OrgSettings> => {
    orgReads++
    return { data: savedOrg }
  },
})
registerEndpoint('/api/org/settings', {
  method: 'PATCH',
  handler: async (event): Promise<ApiResponse<OrgSettings>> => {
    savedOrg = { ...savedOrg, ...(await readBody<Partial<OrgSettings>>(event)) }
    return { data: savedOrg }
  },
})

/** The control a field's label points at — each field is found by what it is, not its order. */
function control(wrapper: VueWrapper, label: string) {
  const id = wrapper
    .findAll('label')
    .find((l) => l.text() === label)
    ?.attributes('for')
  return wrapper.find(`#${id}`)
}

// Signing in AFTER mount, not before: mountSuspended boots a real Nuxt app whose own
// Pinia plugin installs the active instance the component's stores resolve against,
// so a store touched before mount is a different instance than the one rendered.
function signInAs(role: Role) {
  const auth = useAuthStore()
  auth.signIn({
    token: `demo.${role}.stamp`,
    user: { id: 'u-1', name: 'Test User', email: 't@x.com', role },
  })
}

/** Picks a value in the select labelled `label`, as choosing an option does. */
function pick(wrapper: VueWrapper, label: string, value: string) {
  const id = control(wrapper, label).attributes('id')
  const select = wrapper
    .findAllComponents({ name: 'USelect' })
    .find((c) => c.find(`#${id}`).exists())
  select!.vm.$emit('update:modelValue', value)
}

/** Lets in-flight requests and the cache settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50))

describe('SettingsGeneral', () => {
  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    useAuthStore().signOut()
    saved = { defaultMarket: 'All' }
    savedOrg = { presentationCurrency: 'USD' }
    holdReads = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
    focusManager.setFocused(undefined)
  })

  it("renders the organization store's current currency, and lets an Admin change it", async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('admin')

    // Drives the store directly rather than stubbing the org-settings GET — this
    // component reads useOrganizationStore(), not the query, so seeding the store
    // is the more direct way to set up each case.
    useOrganizationStore().setPresentationCurrency('JPY')
    await nextTick()

    expect(wrapper.html()).toContain('JPY')
    expect(wrapper.find('[aria-disabled="true"], [disabled]').exists()).toBe(false)
  })

  it.each<Role>(['viewer', 'analyst'])(
    'disables the currency for a %s — it is Admin-only — but not their default market',
    async (role) => {
      const wrapper = await mountSuspended(Harness)
      signInAs(role)
      await nextTick()

      expect(control(wrapper, 'Presentation currency').attributes('disabled')).toBeDefined()
      expect(control(wrapper, 'Default operating market').attributes('disabled')).toBeUndefined()
    },
  )

  it("saves a Viewer's default market and updates the session default", async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('viewer')
    await nextTick()

    const id = control(wrapper, 'Default operating market').attributes('id')
    const select = wrapper
      .findAllComponents({ name: 'USelect' })
      .find((c) => c.find(`#${id}`).exists())
    select!.vm.$emit('update:modelValue', 'JP')

    await vi.waitFor(() => expect(usePreferencesStore().defaultMarket).toBe('JP'))
    expect(saved.defaultMarket).toBe('JP')
  })

  it('takes a saved market from the save itself, with no read back', async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('viewer')
    await vi.waitFor(() => expect(settingsReads).toBeGreaterThan(0))
    await settle()
    const reads = settingsReads

    pick(wrapper, 'Default operating market', 'TW')

    await vi.waitFor(() => expect(usePreferencesStore().defaultMarket).toBe('TW'))
    await settle()
    expect(settingsReads).toBe(reads)
  })

  it('keeps a saved market when a read sent before the save lands after it', async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('viewer')
    await vi.waitFor(() => expect(settingsReads).toBeGreaterThan(0))
    await settle()

    let release = () => {}
    holdReads = new Promise((resolve) => (release = resolve))
    const reads = settingsReads
    void withNuxtContext(() => useQueryClient().refetchQueries({ queryKey: ['user-settings'] }))
    await vi.waitFor(() => expect(settingsReads).toBe(reads + 1))

    pick(wrapper, 'Default operating market', 'DE')
    await vi.waitFor(() => expect(usePreferencesStore().defaultMarket).toBe('DE'))

    release()
    await settle()
    expect(usePreferencesStore().defaultMarket).toBe('DE')
  })

  it("takes an Admin's saved currency from the save itself, with no read back", async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('admin')
    await vi.waitFor(() => expect(orgReads).toBeGreaterThan(0))
    await settle()
    const reads = orgReads

    pick(wrapper, 'Presentation currency', 'EUR')

    await vi.waitFor(() => expect(useOrganizationStore().presentationCurrency).toBe('EUR'))
    await settle()
    expect(orgReads).toBe(reads)
  })

  it('never rereads the settings in the background, however long the session runs', async () => {
    await mountSuspended(Harness)
    signInAs('viewer')
    await vi.waitFor(() => expect(settingsReads).toBeGreaterThan(0))
    await vi.waitFor(() => expect(orgReads).toBeGreaterThan(0))
    await settle()
    const reads = { me: settingsReads, org: orgReads }

    // Past the 60s every other query goes stale after, then back to the window.
    const later = Date.now() + 61_000
    vi.spyOn(Date, 'now').mockReturnValue(later)
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await settle()

    expect({ me: settingsReads, org: orgReads }).toEqual(reads)
  })
})
