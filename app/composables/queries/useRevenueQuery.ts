import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, RangeToken, RevenueResponse } from '~/types/api'
import type { MarketFilter } from '~/constants/markets'

export const revenueKeys = {
  all: ['revenue'] as const,
  series: (market: MarketFilter, range: RangeToken) =>
    [...revenueKeys.all, 'series', market, range] as const,
}

/**
 * Revenue series for the trend chart.
 *
 * `range` and `market` are in the key because they are data-scope changes. Display
 * currency deliberately is not: every point already carries all four currencies.
 */
export function useRevenueSeries(options?: {
  market?: Ref<MarketFilter>
  range?: Ref<RangeToken>
}) {
  const { $api } = useNuxtApp()
  const filters = useFiltersStore()

  const market = computed(() => options?.market?.value ?? filters.market)
  const range = computed(() => options?.range?.value ?? filters.range)

  return useQuery({
    queryKey: computed(() => revenueKeys.series(market.value, range.value)),
    // Read from the key, not the refs: a fetch for an entry the refs have moved off (a refetch
    // of an inactive entry) must still request what that entry holds.
    queryFn: async ({ queryKey: [, , market, range] }) => {
      const response = await $api<ApiResponse<RevenueResponse>>('/analytics/revenue', {
        query: { market, range },
      })
      return response.data
    },
  })
}
