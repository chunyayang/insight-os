import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ApiResponse, UpdateUserSettingsRequest, UserSettings } from '~/types/api'
import { userSettingsKeys } from './useUserSettingsQuery'

/**
 * On success the store is seeded directly, so the Dashboard rescopes without waiting on
 * a refetch, and the query is invalidated so a later reload confirms the same value.
 */
export function useUpdateDefaultMarketMutation() {
  const { $api } = useNuxtApp()
  const preferences = usePreferencesStore()
  const queryClient = useQueryClient()
  const { success } = useNotify()

  return useMutation({
    mutationFn: async (payload: UpdateUserSettingsRequest): Promise<UserSettings> => {
      const response = await $api<ApiResponse<UserSettings>>('/settings/me', {
        method: 'PATCH',
        body: payload,
      })
      return response.data
    },
    onSuccess: (data) => {
      preferences.setDefaultMarket(data.defaultMarket)
      queryClient.invalidateQueries({ queryKey: userSettingsKeys.all })
      success('settings.general.saved')
    },
  })
}
