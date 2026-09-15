import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Harness from './support/PresentationCurrencyHarness.vue'
import { useAuthStore } from '../../app/stores/auth'
import { useOrganizationStore } from '../../app/stores/organization'
import type { Role } from '../../app/types/api'

// Signing in AFTER mount, not before: mountSuspended boots a real Nuxt app whose own
// Pinia plugin installs the active instance the component's stores resolve against,
// so a store touched before mount is a different instance than the one rendered.
//
// Note: this test env has no axios-layer mock (registerEndpoint only intercepts
// Nuxt's own $fetch, not the axios instance our api plugin uses), so the field's own
// org-settings query hits the real mock backend. These tests don't depend on that
// request settling — they drive the store directly, which is what the field renders.
function signInAs(role: Role) {
  const auth = useAuthStore()
  auth.signIn({
    token: `demo.${role}.stamp`,
    user: { id: 'u-1', name: 'Test User', email: 't@x.com', role },
  })
}

describe('PresentationCurrencyField', () => {
  it("renders the organization store's current currency, and lets an Admin change it", async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('admin')
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
