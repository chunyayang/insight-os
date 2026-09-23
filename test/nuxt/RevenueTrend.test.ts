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
    // happy-dom's canvas.getContext('2d') returns null, which zrender doesn't tolerate:
    // it throws "Cannot set properties of null (setting 'dpr')" as an unhandled rejection
    // that fails the run. vue-echarts names its component "Echarts" (not the local
    // `VChart` import), so that's the key the stub has to match.
    const wrapper = await mountSuspended(RevenueTrend, { global: { stubs: { Echarts: true } } })

    await vi.waitFor(() => {
      if (wrapper.find('[aria-busy="true"]').exists()) throw new Error('still loading')
    })

    expect(wrapper.text()).toContain('shown in USD') // default presentation currency

    useOrganizationStore().setPresentationCurrency('EUR')
    await nextTick()

    // The chart caption is the accessible summary the chart's canvas can't provide.
    expect(wrapper.text()).toContain('shown in EUR')
    expect(wrapper.text()).not.toContain('shown in USD')
  })

  it('formats tooltip and axis values as money in the presentation currency', async () => {
    useOrganizationStore().setPresentationCurrency('JPY')
    const wrapper = await mountSuspended(RevenueTrend, { global: { stubs: { Echarts: true } } })
    await vi.waitFor(() => {
      if (!wrapper.findComponent({ name: 'Echarts' }).exists()) throw new Error('still loading')
    })

    const option = wrapper.findComponent({ name: 'Echarts' }).props('option') as {
      tooltip: { valueFormatter: (value: number) => string }
      yAxis: { axisLabel: { formatter: (value: number) => string } }
    }
    // JPY is zero-decimal on screen, whatever precision the payload carries.
    expect(option.tooltip.valueFormatter(193_456.7)).toBe('¥193,457')
    expect(option.yAxis.axisLabel.formatter(15_000_000)).toBe('¥15M')
  })
})
