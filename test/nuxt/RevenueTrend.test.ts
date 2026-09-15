import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RevenueTrend from '../../app/components/dashboard/RevenueTrend.vue'
import { useOrganizationStore } from '../../app/stores/organization'

describe('RevenueTrend', () => {
  it("plots every line in the organization's presentation currency, not a hardcoded USD", async () => {
    const wrapper = await mountSuspended(RevenueTrend)

    // The revenue query hits the real mock backend — registerEndpoint only intercepts
    // Nuxt's $fetch, not the axios instance $api uses — so wait for the skeleton to
    // clear instead of a fixed sleep; request timing isn't ours to control.
    await vi.waitFor(() => {
      if (wrapper.find('[aria-busy="true"]').exists()) throw new Error('still loading')
    })

    expect(wrapper.text()).toContain('shown in USD') // default presentation currency

    useOrganizationStore().setPresentationCurrency('EUR')
    await nextTick()

    // The chart caption is the accessible summary Chart.js's canvas can't provide.
    expect(wrapper.text()).toContain('shown in EUR')
    expect(wrapper.text()).not.toContain('shown in USD')
  })
})
