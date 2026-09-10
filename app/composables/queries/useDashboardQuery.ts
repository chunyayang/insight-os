import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, DashboardSummary } from '~/types/api'
import type { MarketFilter } from '~/constants/markets'

/**
 * Query-key factory for the dashboard domain. Keys are never inlined at call sites —
 * that's what makes targeted invalidation possible later.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (market: MarketFilter) => [...dashboardKeys.all, 'summary', market] as const,
}

/**
 * Dashboard summary. The market is the session's default operating market — NOT a
 * URL-backed page filter, deliberately: the KPI cards expose no market control (spec
 * §4.2, "cross-market aggregates"), so there is nothing on this page for a `?market=`
 * param to be a view onto. It still flows into the query key, so changing the default
 * in Settings refetches. A market picked on Customers or Analytics never reaches here.
 *
 * Note what is NOT here: display currency. The payload carries all four currencies, so
 * switching currency is a client-side key switch with no request.
 */
export function useDashboardSummary(options?: { market?: Ref<MarketFilter> }) {
  const { $api } = useNuxtApp()
  const filters = useFiltersStore()

  const market = computed(() => options?.market?.value ?? filters.defaultMarket)

  return useQuery({
    // A computed key keeps the query reactive to the market filter.
    queryKey: computed(() => dashboardKeys.summary(market.value)),
    queryFn: async () => {
      const response = await $api.get<ApiResponse<DashboardSummary>>('/dashboard/summary', {
        params: { market: market.value },
      })
      return response.data.data
    },
  })
}
