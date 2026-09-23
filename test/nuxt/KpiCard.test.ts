import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import KpiCard from '../../app/components/dashboard/KpiCard.vue'
import { useOrganizationStore } from '../../app/stores/organization'
import type { KpiMetric, Money } from '../../app/types/api'

const money: Money = { USD: 240_499.66, JPY: 38_304_797, TWD: 7_671_166.43, EUR: 223_875.69 }

function metric(overrides: Partial<KpiMetric> = {}): KpiMetric {
  return {
    key: 'revenue',
    value: money,
    deltaPct: 0.0501,
    sparkline: [1, 2, 3, 4, 5],
    ...overrides,
  } as KpiMetric
}

// happy-dom's canvas.getContext('2d') returns null, which zrender doesn't tolerate: it
// throws "Cannot set properties of null (setting 'dpr')" as an unhandled rejection that
// fails the run. vue-echarts names its component "Echarts" (not the local `VChart`
// import), so that's the key the stub has to match.
const stubs = { global: { stubs: { Echarts: true } } }

describe('KpiCard', () => {
  it('renders a monetary KPI in the presentation currency, USD by default', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() }, ...stubs })
    const text = wrapper.text()

    expect(text).toContain('240,499.66')
    expect(text).toContain('+5.0%')
  })

  it('re-renders the KPI when the presentation currency changes — no selector on this page', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() }, ...stubs })
    expect(wrapper.text()).toContain('240,499.66') // USD default

    // Settings → General is the only writer; the store is shared across the app, so a
    // Dashboard KPI reacts even though it has no currency control of its own.
    useOrganizationStore().setPresentationCurrency('EUR')
    await nextTick()

    expect(wrapper.text()).toContain('223,875.69')
    expect(wrapper.text()).not.toContain('240,499.66')
  })

  it('formats a percentage KPI as a ratio, not a raw number', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ key: 'conversionRate', value: 0.0263, deltaPct: -0.18 }) },
      ...stubs,
    })
    expect(wrapper.text()).toContain('2.6%')
  })

  it('signs a negative delta and marks it as a downward trend', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ key: 'orders', value: 3332, deltaPct: -0.18 }) },
      ...stubs,
    })

    expect(wrapper.text()).toContain('-18.0%')
    // Direction is conveyed by a semantic class, not colour alone.
    expect(wrapper.html()).toContain('kpi__delta--down')
  })

  it('renders a whole-number KPI with grouping', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { metric: metric({ key: 'activeUsers', value: 67_000, deltaPct: 0 }) },
      ...stubs,
    })
    expect(wrapper.text()).toContain('67,000')
  })

  it('gives the sparkline an accessible text summary', async () => {
    const wrapper = await mountSuspended(KpiCard, { props: { metric: metric() }, ...stubs })
    // The chart root is aria-hidden, so the meaning must live in the caption.
    expect(wrapper.html()).toContain('aria-hidden="true"')
    expect(wrapper.text()).toMatch(/14-day trend/i)
  })
})
