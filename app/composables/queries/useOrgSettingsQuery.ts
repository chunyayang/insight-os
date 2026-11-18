import { useQuery } from '@tanstack/vue-query'
import { DEFAULT_CURRENCY } from '~/constants/markets'
import type { ApiResponse, CurrencyCode, OrgSettings } from '~/types/api'

export const orgSettingsKeys = {
  all: ['org-settings'] as const,
}

/**
 * Organization config (spec §4.10). Any surface may call it: the layout fetches it once and
 * renders no page until it settles, and with `staleTime: Infinity` every other call reads
 * the cache without a request.
 *
 * Returns the query plus each setting resolved with its fallback, so a caller never reads
 * `data` and never renders or sends an unset value when the load failed.
 */
export function useOrgSettingsQuery() {
  const { $api } = useNuxtApp()

  const query = useQuery({
    queryKey: orgSettingsKeys.all,
    queryFn: async () => {
      const response = await $api<ApiResponse<OrgSettings>>('/org/settings')
      return response.data
    },
    // Organization policy, changed rarely (spec §4.10), and an Admin's save writes its
    // response into the cache. Other sessions pick up a change on their next page load,
    // which SSR fetches fresh.
    staleTime: Infinity,
    // Once, not the client default of three: the layout shows no page while this loads, so a
    // load that keeps failing would hold it blank for seconds. One retry covers a blip; after
    // that the page renders on the fallbacks. (On the server Vue Query never retries.)
    retry: 1,
    // A failed load has been retried and the page rendered on the fallbacks. A component that
    // reads a setting must not restart it on mount: that sets the query pending again, and the
    // layout would hide the page that just mounted.
    retryOnMount: false,
  })

  const presentationCurrency = computed<CurrencyCode>(
    () => query.data.value?.presentationCurrency ?? DEFAULT_CURRENCY,
  )

  return { ...query, presentationCurrency }
}
