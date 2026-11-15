import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, CurrencyCode, DashboardSummary, LocaleCode } from '~/types/api'
import type { MarketFilter } from '~/constants/markets'

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
 * Dashboard summary, scoped to the session's default operating market (spec §4.2): read from
 * the preferences store, never from the URL or another page's filter. `/` takes no `?market=`.
 * The layout renders no page before the store is seeded, so the first request is already
 * scoped to the user's market.
 * Amounts carry all four currencies, but the `All` revenue delta, sparkline and AI summary are
 * computed in one: the presentation currency, read from the organization store and sent.
 */
export function useDashboardSummary() {
  const { $api } = useNuxtApp()
  const preferences = usePreferencesStore()
  const organization = useOrganizationStore()
  const { locale } = useI18n()

  const market = computed(() => preferences.defaultMarket)

  return useQuery({
    // Locale is in the key because the AI summary and alerts are written in it, the currency
    // because the delta, sparkline and summary are computed in it: a Settings save refetches.
    queryKey: computed(() =>
      dashboardKeys.summary(market.value, locale.value, organization.presentationCurrency),
    ),
    queryFn: async () => {
      const response = await $api<ApiResponse<DashboardSummary>>('/dashboard/summary', {
        query: {
          market: market.value,
          locale: locale.value,
          presentationCurrency: organization.presentationCurrency,
        },
      })
      return response.data
    },
  })
}
