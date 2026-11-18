import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { revenueKeys, useRevenueSeries } from '../../app/composables/queries/useRevenueQuery'
import type { MarketFilter } from '../../app/constants/markets'
import type { ApiResponse, RangeToken, RevenueResponse } from '../../app/types/api'
import { withNuxtContext } from './support/context'

const requests: { market: string; range: string }[] = []
registerEndpoint('/api/analytics/revenue', (event: { path: string }) => {
  const params = new URL(event.path, 'http://x').searchParams
  requests.push({ market: params.get('market') ?? '', range: params.get('range') ?? '' })
  return { data: { series: [], totalsByMarket: [] } } as unknown as ApiResponse<RevenueResponse>
})

describe('useRevenueSeries', () => {
  let unmount = () => {}

  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    requests.length = 0
  })

  afterEach(() => unmount())

  it('refetches an inactive entry with the params in its key, not the ones now in the refs', async () => {
    const market = ref<MarketFilter>('US')
    const range = ref<RangeToken>('30d')
    const wrapper = await mountSuspended(
      defineComponent({
        setup() {
          useRevenueSeries({ market, range })
          return () => h('div')
        },
      }),
    )
    unmount = () => wrapper.unmount()
    await vi.waitFor(() => expect(requests).toEqual([{ market: 'US', range: '30d' }]))

    market.value = 'JP'
    range.value = '7d'
    await vi.waitFor(() => expect(requests.at(-1)).toEqual({ market: 'JP', range: '7d' }))

    // The US entry is inactive now; refetching it must not fill it with JP's series.
    requests.length = 0
    await withNuxtContext(() =>
      useQueryClient().refetchQueries({
        queryKey: revenueKeys.series('US', '30d'),
        exact: true,
        type: 'all',
      }),
    )
    expect(requests).toEqual([{ market: 'US', range: '30d' }])
  })
})
