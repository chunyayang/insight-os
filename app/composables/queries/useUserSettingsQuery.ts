import { useQuery } from '@tanstack/vue-query'
import type { MarketFilter } from '~/constants/markets'
import type { ApiResponse, UserSettings } from '~/types/api'

/** Keyed by user, so a different sign-in in the same tab never reads the last user's cache. */
export const userSettingsKeys = {
  all: ['user-settings'] as const,
  me: (userId: string | undefined) => [...userSettingsKeys.all, userId] as const,
}

/**
 * The signed-in user's own settings (spec §4.10). Any surface may call it: the layout fetches
 * it once and renders no page until it settles, and with `staleTime: Infinity` every other
 * call reads the cache without a request.
 *
 * Returns the query plus each setting resolved with its fallback. Until this user's settings
 * arrive their key holds nothing, so `defaultMarket` reads `'All'` and a new sign-in never
 * starts on the previous user's market.
 */
export function useUserSettingsQuery() {
  const { $api } = useNuxtApp()
  const auth = useAuthStore()

  const userId = computed(() => auth.user?.id)

  const query = useQuery({
    queryKey: computed(() => userSettingsKeys.me(userId.value)),
    queryFn: async () => {
      const response = await $api<ApiResponse<UserSettings>>('/me/settings')
      return response.data
    },
    enabled: computed(() => Boolean(userId.value)),
    // Only this user changes these, and a save writes its response into the cache, so no
    // background refetch has anything to find. A change from another tab or device shows
    // on the next page load, which SSR fetches fresh.
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

  const defaultMarket = computed<MarketFilter>(() => query.data.value?.defaultMarket ?? 'All')

  return { ...query, defaultMarket }
}
