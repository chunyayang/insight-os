import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { readBody } from 'h3'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import Harness from './support/SettingsGeneralHarness.vue'
import { useAuthStore } from '../../app/stores/auth'
import { useOrganizationStore } from '../../app/stores/organization'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { ApiResponse, Role, UserSettings } from '../../app/types/api'

let saved: UserSettings = { defaultMarket: 'All' }
registerEndpoint('/api/settings/me', {
  method: 'GET',
  handler: (): ApiResponse<UserSettings> => ({ data: saved }),
})
registerEndpoint('/api/settings/me', {
  method: 'PATCH',
  handler: async (event): Promise<ApiResponse<UserSettings>> => {
    saved = { ...saved, ...(await readBody<Partial<UserSettings>>(event)) }
    return { data: saved }
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

describe('SettingsGeneral', () => {
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
})
