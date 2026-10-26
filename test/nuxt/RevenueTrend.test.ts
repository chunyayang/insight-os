import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import RevenueTrend from '../../app/components/dashboard/RevenueTrend.vue'
import { useOrganizationStore } from '../../app/stores/organization'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { ApiResponse, RevenueResponse } from '../../app/types/api'
import { stubElementSize } from './support/layout'

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

// $api (app/plugins/api.ts) is now a $fetch instance, so registerEndpoint can stub the
// underlying Nitro route directly for a deterministic response.
const requestedMarkets: string[] = []
registerEndpoint('/api/analytics/revenue', (event: { path: string }) => {
  requestedMarkets.push(new URL(event.path, 'http://x').searchParams.get('market') ?? '')
  return revenueFixture
})

describe('RevenueTrend', () => {
  stubElementSize()

  afterEach(() => {
    usePreferencesStore().setDefaultMarket('All')
    requestedMarkets.length = 0
  })

  it("opens on the user's default operating market", async () => {
    usePreferencesStore().setDefaultMarket('JP')
    const wrapper = await mountSuspended(RevenueTrend)

    await vi.waitFor(() => expect(requestedMarkets).toEqual(['JP']))
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('JP')
  })

  it('never writes a picked tab back to the default', async () => {
    const wrapper = await mountSuspended(RevenueTrend)
    await vi.waitFor(() => expect(requestedMarkets).toEqual(['All']))

    const de = wrapper.findAll('[role="tab"]').find((tab) => tab.text() === 'DE')
    await de!.trigger('mousedown')
    await vi.waitFor(() => expect(requestedMarkets.at(-1)).toBe('DE'))
    expect(usePreferencesStore().defaultMarket).toBe('All')
  })

  it("plots every line in the organization's presentation currency, not a hardcoded USD", async () => {
    const wrapper = await mountSuspended(RevenueTrend)

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
    const wrapper = await mountSuspended(RevenueTrend)
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

  it('keeps the lines out of pointer interaction while the axis tooltip stays on', async () => {
    const wrapper = await mountSuspended(RevenueTrend)
    await vi.waitFor(() => {
      if (!wrapper.findComponent({ name: 'Echarts' }).exists()) throw new Error('still loading')
    })

    const option = wrapper.findComponent({ name: 'Echarts' }).props('option') as {
      tooltip: { trigger: string }
      series: { silent?: boolean }[]
    }
    // A non-silent line gets ECharts' pointer cursor, and clicking a line does nothing.
    expect(option.series.every((s) => s.silent === true)).toBe(true)
    expect(option.tooltip.trigger).toBe('axis')
  })
})
