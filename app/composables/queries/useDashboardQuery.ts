import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, DashboardSummary, LocaleCode } from '~/types/api'
import type { MarketFilter } from '~/constants/markets'

/**
 * Query-key factory for the dashboard domain. Keys are never inlined at call sites —
 * that's what makes targeted invalidation possible later.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (market: MarketFilter, locale: LocaleCode) =>
    [...dashboardKeys.all, 'summary', market, locale] as const,
}

/**
 * Dashboard summary. The market filter comes from Pinia as a reactive ref and flows
 * into the query key, so changing it refetches automatically. So does the locale: the
 * payload's AI summary is written in it.
 *
 * Note what is NOT here: display currency. The payload carries all four currencies, so
 * switching currency is a client-side key switch with no request.
 */
export function useDashboardSummary() {
  const { $api } = useNuxtApp()
  const filters = useFiltersStore()
  const { locale } = useI18n()

  const market = computed(() => filters.market)

  return useQuery({
    // A computed key keeps the query reactive to the Pinia filter.
    queryKey: computed(() => dashboardKeys.summary(market.value, locale.value)),
    queryFn: async () => {
      const response = await $api<ApiResponse<DashboardSummary>>('/dashboard/summary', {
        query: { market: market.value, locale: locale.value },
      })
      return response.data
    },
  })
}
