import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, UserSettings } from '~/types/api'

/** Keyed by user, so a different sign-in in the same tab never reads the last user's cache. */
export const userSettingsKeys = {
  all: ['user-settings'] as const,
  me: (userId: string | undefined) => [...userSettingsKeys.all, userId] as const,
}

/**
 * The signed-in user's own settings. Called once from the authenticated layout to seed
 * the preferences store (spec §4.10); every other surface reads `usePreferencesStore()`.
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
  })

  // Synchronous, so the store holds the user's market before anything gated on this
  // query's status (the Dashboard) sees it settle.
  watch(
    () => query.data.value,
    (data) => preferences.setDefaultMarket(data?.defaultMarket ?? 'All'),
    { immediate: true, flush: 'sync' },
  )

  return query
}
