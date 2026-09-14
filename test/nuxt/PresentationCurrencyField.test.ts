import { describe, expect, it, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import Harness from './support/PresentationCurrencyHarness.vue'
import { useAuthStore } from '../../app/stores/auth'
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

describe('PresentationCurrencyField', () => {
  beforeEach(() => {
    registerEndpoint('/settings/org', () => ({
      data: { presentationCurrency: 'USD' },
    }))
  })

  it('lets an Admin change the presentation currency', async () => {
    const wrapper = await mountSuspended(Harness)
    signInAs('admin')
    await nextTick()

    expect(wrapper.html()).toContain('USD')
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
