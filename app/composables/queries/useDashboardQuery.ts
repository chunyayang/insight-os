import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, CurrencyCode, DashboardSummary, LocaleCode } from '~/types/api'
import type { MarketFilter } from '~/constants/markets'
import { useOrgSettingsQuery } from './useOrgSettingsQuery'
import { useUserSettingsQuery } from './useUserSettingsQuery'

/**
 * Query-key factory for the dashboard domain. Keys are never inlined at call sites —
 * that's what makes targeted invalidation possible later.
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: (market: MarketFilter, locale: LocaleCode, presentationCurrency: CurrencyCode) =>
    [...dashboardKeys.all, 'summary', market, locale, presentationCurrency] as const,
}

/**
 * Dashboard summary, scoped to the user's default operating market (spec §4.2): read from
 * their settings, never from the URL or another page's filter. `/` takes no `?market=`.
 * The layout renders no page before the settings settle, so the first request is already
 * scoped to the user's market.
 * The revenue KPI comes back in one currency the server declares: the market's functional
 * currency, or at `All` the organization's presentation currency, which the request sends.
 */
export function useDashboardSummary() {
  const { $api } = useNuxtApp()
  const { defaultMarket } = useUserSettingsQuery()
  const { presentationCurrency } = useOrgSettingsQuery()
  const { locale } = useI18n()

  return useQuery({
    // Locale is in the key because the AI summary and alerts are written in it, the currency
    // because the delta, sparkline and summary are computed in it: a Settings save refetches.
    queryKey: computed(() =>
      dashboardKeys.summary(defaultMarket.value, locale.value, presentationCurrency.value),
    ),
    // The request is read from the key, not the settings: a fetch that runs after they have
    // moved on (a refetch of an inactive entry) must still match the entry it fills.
    queryFn: async ({ queryKey: [, , market, locale, presentationCurrency] }) => {
      const response = await $api<ApiResponse<DashboardSummary>>('/dashboard/summary', {
        query: { market, locale, presentationCurrency },
      })
      return response.data
    },
  })
}
