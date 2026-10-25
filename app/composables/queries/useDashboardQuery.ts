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
 * Dashboard summary, scoped to the session's default operating market (spec §4.2). That
 * scope is configuration, read straight from the preferences store, never from the URL or a
 * page's filter: `/` takes no `?market=`, and no other page's market control reaches it. The
 * locale is in the key too: the payload's AI summary is written in it.
 *
 * It waits while the user's settings load, so the page never fetches `All` only to refetch
 * the user's market a moment later. A failed settings load leaves the default at `All`.
 *
 * Note what is NOT here: display currency. The payload carries all four currencies, so
 * switching currency is a client-side key switch with no request.
 */
export function useDashboardSummary() {
  const { $api } = useNuxtApp()
  const preferences = usePreferencesStore()
  const settings = useUserSettingsQuery()
  const { locale } = useI18n()

  const market = computed(() => preferences.defaultMarket)

  return useQuery({
    queryKey: computed(() => dashboardKeys.summary(market.value, locale.value)),
    queryFn: async () => {
      const response = await $api<ApiResponse<DashboardSummary>>('/dashboard/summary', {
        query: { market: market.value, locale: locale.value },
      })
      return response.data
    },
    enabled: computed(() => !settings.isPending.value),
  })
}
