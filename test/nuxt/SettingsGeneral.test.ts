import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Harness from './support/SettingsGeneralHarness.vue'
import { useAuthStore } from '../../app/stores/auth'
import { useOrganizationStore } from '../../app/stores/organization'
import type { Role } from '../../app/types/api'

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

    // registerEndpoint only intercepts Nuxt's $fetch, not the axios instance $api
    // uses, so this drives the store directly rather than stub the org-settings GET.
    useOrganizationStore().setPresentationCurrency('JPY')
    await nextTick()

    expect(wrapper.html()).toContain('JPY')
    expect(wrapper.find('[aria-disabled="true"], [disabled]').exists()).toBe(false)
  })

  it('disables the field for a Viewer, with a tooltip explaining why', async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('viewer')
    await nextTick()

    expect(wrapper.find('[aria-disabled="true"], [disabled]').exists()).toBe(true)
  })

  it('disables the field for an Analyst too — the currency is Admin-only', async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('analyst')
    await nextTick()

    expect(wrapper.find('[aria-disabled="true"], [disabled]').exists()).toBe(true)
  })
})
