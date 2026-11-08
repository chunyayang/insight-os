import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ApiResponse, UpdateUserSettingsRequest, UserSettings } from '~/types/api'
import { userSettingsKeys } from './useUserSettingsQuery'

/**
 * The PATCH answers with the whole `UserSettings`, so it becomes the query's data with no
 * refetch, and the query's own seed carries it into the preferences store.
 */
export function useUpdateDefaultMarketMutation() {
  const { $api } = useNuxtApp()
  const auth = useAuthStore()
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
    onSuccess: async (data) => {
      // A read still in flight was sent before the save, and would land the old value after it.
      await queryClient.cancelQueries({ queryKey: userSettingsKeys.all })
      queryClient.setQueryData(userSettingsKeys.me(auth.user?.id), data)
      success('settings.general.saved')
    },
  })
}
