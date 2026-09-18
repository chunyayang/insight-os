import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RevenueTrend from '../../app/components/dashboard/RevenueTrend.vue'
import { useOrganizationStore } from '../../app/stores/organization'
import type { ApiResponse, RevenueResponse } from '../../app/types/api'

const revenueFixture: ApiResponse<RevenueResponse> = {
  data: {
    fx: {
      method: 'historical-daily-official',
      source: 'internal-fx-eod',
      rangeFrom: '2026-08-19',
      rangeTo: '2026-09-17',
    },
    series: [
      {
        market: 'US',
        points: [{ t: '2026-09-17', value: { USD: 1000, JPY: 150_000, TWD: 31_000, EUR: 900 } }],
      },
    ],
    totalsByMarket: [{ market: 'US', total: { USD: 1000, JPY: 150_000, TWD: 31_000, EUR: 900 } }],
  },
}

// $api (app/plugins/api.ts) is a plain Axios instance, not Nuxt's $fetch — registerEndpoint
// only intercepts the latter — so stub the Axios layer itself for a deterministic response.
vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: vi.fn().mockResolvedValue({ data: revenueFixture }),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }),
  },
}))

describe('RevenueTrend', () => {
  it("plots every line in the organization's presentation currency, not a hardcoded USD", async () => {
    const wrapper = await mountSuspended(RevenueTrend)

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
