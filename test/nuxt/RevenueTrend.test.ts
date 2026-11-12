import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import RevenueTrend from '../../app/components/dashboard/RevenueTrend.vue'
import { useOrganizationStore } from '../../app/stores/organization'
import { usePreferencesStore } from '../../app/stores/preferences'
import type { ApiResponse, RevenueResponse } from '../../app/types/api'
import { stubElementSize } from './support/layout'

const usdPoint = { USD: 1000, JPY: 150_000, TWD: 31_000, EUR: 900 }
const jpPoint = { USD: 51_000, JPY: 7_700_000, TWD: 1_580_000, EUR: 47_000 }

// One series per request: JP's in yen when the chart asks for JP, otherwise US's.
function revenueFixture(market: string): ApiResponse<RevenueResponse> {
  const isJp = market === 'JP'
  const value = isJp ? jpPoint : usdPoint
  return {
    data: {
      fx: {
        method: 'historical-daily-official',
        source: 'internal-fx-eod',
        rangeFrom: '2026-08-19',
        rangeTo: '2026-09-17',
      },
      series: [
        {
          market: isJp ? 'JP' : 'US',
          functionalCurrency: isJp ? 'JPY' : 'USD',
          points: [{ t: '2026-09-17', value }],
        },
      ],
      totalsByMarket: [{ market: isJp ? 'JP' : 'US', total: value }],
    },
  }
}

// $api (app/plugins/api.ts) is now a $fetch instance, so registerEndpoint can stub the
// underlying Nitro route directly for a deterministic response.
const requestedMarkets: string[] = []
registerEndpoint('/api/analytics/revenue', (event: { path: string }) => {
  const market = new URL(event.path, 'http://x').searchParams.get('market') ?? ''
  requestedMarkets.push(market)
  return revenueFixture(market)
})

type ChartOption = {
  tooltip: { valueFormatter: (value: number) => string }
  yAxis: { axisLabel: { formatter: (value: number) => string } }
  series: { data: number[] }[]
}

async function mountLoaded() {
  const wrapper = await mountSuspended(RevenueTrend)
  await vi.waitFor(() => {
    if (!wrapper.findComponent({ name: 'Echarts' }).exists()) throw new Error('still loading')
  })
  return wrapper
}
const chartOption = (wrapper: Awaited<ReturnType<typeof mountLoaded>>) =>
  wrapper.findComponent({ name: 'Echarts' }).props('option') as ChartOption

describe('RevenueTrend', () => {
  stubElementSize()

  afterEach(() => {
    usePreferencesStore().setDefaultMarket('All')
    useOrganizationStore().setPresentationCurrency('USD')
    requestedMarkets.length = 0
  })

  it('shows every market tab at `All`, opening on All', async () => {
    const wrapper = await mountSuspended(RevenueTrend)

    await vi.waitFor(() => expect(requestedMarkets).toEqual(['All']))
    expect(wrapper.findAll('[role="tab"]').map((tab) => tab.text())).toEqual([
      'All',
      'US',
      'JP',
      'TW',
      'DE',
    ])
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('All')
  })

  it('hides the tabs when the default operating market is a single market, and shows that market', async () => {
    usePreferencesStore().setDefaultMarket('JP')
    const wrapper = await mountSuspended(RevenueTrend)

    await vi.waitFor(() => expect(requestedMarkets).toEqual(['JP']))
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
  })

  it('never writes a picked tab back to the default', async () => {
    const wrapper = await mountSuspended(RevenueTrend)
    await vi.waitFor(() => expect(wrapper.find('[role="tab"]').exists()).toBe(true))

    const de = wrapper.findAll('[role="tab"]').find((tab) => tab.text() === 'DE')
    await de!.trigger('mousedown')
    await vi.waitFor(() => expect(requestedMarkets.at(-1)).toBe('DE'))
    expect(usePreferencesStore().defaultMarket).toBe('All')
  })

  it('lands on the new default when it changes, dropping a picked tab', async () => {
    const wrapper = await mountSuspended(RevenueTrend)
    const selected = () => wrapper.find('[role="tab"][aria-selected="true"]').text()
    await vi.waitFor(() => expect(selected()).toBe('All'))

    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text() === 'DE')!
      .trigger('mousedown')
    await vi.waitFor(() => expect(selected()).toBe('DE'))

    // TW, which no earlier test has fetched: the query cache outlives a test.
    usePreferencesStore().setDefaultMarket('TW')
    await vi.waitFor(() => expect(requestedMarkets.at(-1)).toBe('TW'))
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)

    // Back at `All`, the tabs return on All, not on the DE picked before.
    usePreferencesStore().setDefaultMarket('All')
    await vi.waitFor(() => expect(selected()).toBe('All'))
  })

  it('plots a single market in its declared functional currency, not the presentation currency', async () => {
    useOrganizationStore().setPresentationCurrency('EUR')
    usePreferencesStore().setDefaultMarket('JP')
    const wrapper = await mountLoaded()

    expect(wrapper.text()).toContain('shown in JPY')
    expect(chartOption(wrapper).series[0]!.data).toEqual([7_700_000])
    expect(chartOption(wrapper).yAxis.axisLabel.formatter(15_000_000)).toBe('¥15M')
    expect(chartOption(wrapper).tooltip.valueFormatter(7_700_000)).toBe('¥7,700,000')

    // The presentation currency has no say at this scope.
    useOrganizationStore().setPresentationCurrency('USD')
    await nextTick()
    expect(wrapper.text()).toContain('shown in JPY')
  })

  it('keeps a single-market tab picked at `All` in the presentation currency', async () => {
    // EUR, so neither the series' JPY nor a hardcoded USD could pass for it.
    useOrganizationStore().setPresentationCurrency('EUR')
    const wrapper = await mountLoaded()

    await wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text() === 'JP')!
      .trigger('mousedown')
    await vi.waitFor(() => expect(chartOption(wrapper).series[0]!.data).toEqual([47_000]))
    expect(wrapper.text()).toContain('shown in EUR')
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
