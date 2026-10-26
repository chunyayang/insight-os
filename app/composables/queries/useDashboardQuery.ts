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
 * Dashboard summary, scoped to the session's default operating market (spec §4.2): read from
 * the preferences store, never from the URL or another page's filter. `/` takes no `?market=`.
 * No currency param: the payload carries all four, so a currency switch needs no request.
 */
export function useDashboardSummary() {
  const { $api } = useNuxtApp()
  const preferences = usePreferencesStore()
  const settings = useUserSettingsQuery()
  const { locale } = useI18n()

  const market = computed(() => preferences.defaultMarket)

  return useQuery({
    // Locale is in the key because the payload's AI summary is written in it.
    queryKey: computed(() => dashboardKeys.summary(market.value, locale.value)),
    queryFn: async () => {
      const response = await $api<ApiResponse<DashboardSummary>>('/dashboard/summary', {
        query: { market: market.value, locale: locale.value },
      })
      return response.data
    },
    // Wait for the user's settings, so the page never fetches `All` and then refetches their
    // market. A failed settings load leaves the default at `All`.
    enabled: computed(() => !settings.isPending.value),
  })
}
