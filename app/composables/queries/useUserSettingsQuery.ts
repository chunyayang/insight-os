import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, UserSettings } from '~/types/api'

/** Keyed by user, so a different sign-in in the same tab never reads the last user's cache. */
export const userSettingsKeys = {
  all: ['user-settings'] as const,
  me: (userId: string | undefined) => [...userSettingsKeys.all, userId] as const,
}

/**
 * The signed-in user's own settings, which seed the preferences store (spec §4.10). Called
 * only by the authenticated layout, which renders no page until it settles: pages read the
 * market from `usePreferencesStore()` and never wait on this query themselves.
 *
 * Until this user's settings arrive the store reads `'All'`, so a new sign-in never
 * starts on the previous user's market.
 */
export function useUserSettingsQuery() {
  const { $api } = useNuxtApp()
  const auth = useAuthStore()
  const preferences = usePreferencesStore()

  const userId = computed(() => auth.user?.id)

  const query = useQuery({
    queryKey: computed(() => userSettingsKeys.me(userId.value)),
    queryFn: async () => {
      const response = await $api<ApiResponse<UserSettings>>('/settings/me')
      return response.data
    },
    enabled: computed(() => Boolean(userId.value)),
    // Only this user changes these, and a save writes its response into the cache, so no
    // background refetch has anything to find. A change from another tab or device shows
    // on the next page load, which SSR fetches fresh.
    staleTime: Infinity,
  })

  // Synchronous, so the store holds the user's market before the layout, gated on this
  // query's status, renders the page.
  watch(
    () => query.data.value,
    (data) => preferences.setDefaultMarket(data?.defaultMarket ?? 'All'),
    { immediate: true, flush: 'sync' },
  )

  return query
}
