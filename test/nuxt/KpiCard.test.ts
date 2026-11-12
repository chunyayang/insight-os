import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import KpiCard from '../../app/components/dashboard/KpiCard.vue'
import { useChartTheme } from '../../app/composables/useChartTheme'
import { useOrganizationStore } from '../../app/stores/organization'
import type { KpiMetric, Money } from '../../app/types/api'
import { stubElementSize } from './support/layout'

const money: Money = { USD: 240_499.66, JPY: 38_304_797, TWD: 7_671_166.43, EUR: 223_875.69 }

function metric(overrides: Partial<KpiMetric> = {}): KpiMetric {
  return {
    key: 'revenue',
    value: money,
    functionalCurrency: null,
    deltaPct: 0.0501,
    sparkline: [1, 2, 3, 4, 5],
    ...overrides,
  } as KpiMetric
}

describe('KpiCard', () => {
  stubElementSize()

  afterEach(() => {
    useOrganizationStore().setPresentationCurrency('USD')
  })

  // What a sighted reader sees: the full amount is in a screen-reader-only span.
  const visible = (wrapper: { find: (s: string) => { text: () => string } }, selector: string) =>
    wrapper.find(`${selector} [aria-hidden="true"]`).text()

  it('abbreviates a monetary KPI in the presentation currency, USD by default', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() } })

    expect(visible(wrapper, '.kpi__value')).toBe('$240.5K')
    expect(wrapper.text()).toContain('+5.0%')
  })

  it('keeps the full amount on hover and for screen readers', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() } })
    const value = wrapper.find('.kpi__value')

    expect(value.attributes('title')).toBe('$240,499.66')
    expect(value.find('.sr-only').text()).toBe('$240,499.66')
  })

  it('re-renders the KPI when the presentation currency changes — no selector on this page', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() } })
    expect(visible(wrapper, '.kpi__value')).toBe('$240.5K') // USD default

    // Settings → General is the only writer; the store is shared across the app, so a
    // Dashboard KPI reacts even though it has no currency control of its own.
    useOrganizationStore().setPresentationCurrency('EUR')
    await nextTick()

    expect(visible(wrapper, '.kpi__value')).toBe('€223.9K')
    expect(wrapper.find('.kpi__value').attributes('title')).toBe('€223,875.69')
  })

  it('renders a single market in the currency it declares, whatever the presentation currency', async () => {
    useOrganizationStore().setPresentationCurrency('EUR')
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ functionalCurrency: 'JPY' }) },
    })
    const value = wrapper.find('.kpi__value')

    // One line, one currency: the abbreviation, the hover and the screen reader agree.
    expect(visible(wrapper, '.kpi__value')).toBe('¥38.3M')
    expect(value.attributes('title')).toBe('¥38,304,797')
    expect(value.find('.sr-only').text()).toBe('¥38,304,797')
    expect(value.text()).not.toContain('€')
  })

  it('formats a percentage KPI as a ratio, not a raw number', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ key: 'conversionRate', value: 0.0263, deltaPct: -0.18 }) },
    })
    expect(wrapper.text()).toContain('2.6%')
  })

  it('signs a negative delta and marks it as a downward trend', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ key: 'orders', value: 3332, deltaPct: -0.18 }) },
    })

    expect(wrapper.text()).toContain('-18.0%')
    // Direction is conveyed by a semantic class, not colour alone.
    expect(wrapper.html()).toContain('kpi__delta--down')
  })

  it('shows a direction arrow on a delta that reads as a change', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ deltaPct: 0.0005 }) },
    })

    expect(wrapper.find('.kpi__delta').text()).toContain('+0.1%')
    expect(wrapper.find('.kpi__delta--up .iconify').exists()).toBe(true)
  })

  it.each([0, 0.0004, -0.0004])('shows no arrow on a delta of %d, which reads 0.0%%', async (d) => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric({ deltaPct: d }) } })

    expect(wrapper.find('.kpi__delta').text()).toContain('0.0%')
    expect(wrapper.find('.kpi__delta--neutral').exists()).toBe(true)
    expect(wrapper.find('.kpi__delta .iconify').exists()).toBe(false)
  })

  it('draws a flat KPI sparkline in its own colour, not a market one', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric({ deltaPct: 0 }) } })
    const option = wrapper.findComponent({ name: 'Echarts' }).props('option')

    expect(option.series[0].color).toBe(useChartTheme().theme.value.flat)
  })

  it('renders a whole-number KPI with grouping', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ key: 'activeUsers', value: 67_000, deltaPct: 0 }) },
    })
    expect(wrapper.find('.kpi__value').text()).toBe('67,000')
  })

  it('gives the sparkline an accessible text summary', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() } })
    // The chart root is aria-hidden, so the meaning must live in the caption.
    expect(wrapper.html()).toContain('aria-hidden="true"')
    // One point per day, so the caption's span follows the series the API sent.
    expect(wrapper.text()).toMatch(/5-day trend/i)
  })

  it('keeps the sparkline out of pointer interaction', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() } })
    const option = wrapper.findComponent({ name: 'Echarts' }).props('option')
    // A non-silent series gets ECharts' pointer cursor and hover emphasis, and a
    // sparkline has nothing to click.
    expect(option.series[0].silent).toBe(true)
  })
})
