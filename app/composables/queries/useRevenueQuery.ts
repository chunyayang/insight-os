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
    queryFn: async () => {
      const response = await $api.get<ApiResponse<RevenueResponse>>('/analytics/revenue', {
        params: { market: market.value, range: range.value },
      })
      return response.data.data
    },
  })
}
