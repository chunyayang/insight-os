import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ApiResponse, OrgSettings, UpdateOrgSettingsRequest } from '~/types/api'
import { orgSettingsKeys } from './useOrgSettingsQuery'

/**
 * Settings → General is the only writer of organization config. The PATCH answers with
 * the whole `OrgSettings`, so it becomes the query's data with no refetch, and the
 * query's own seed carries it into the organization store.
 */
export function useUpdatePresentationCurrencyMutation() {
  const { $api } = useNuxtApp()
  const queryClient = useQueryClient()
  const { success } = useNotify()

  return useMutation({
    mutationFn: async (payload: UpdateOrgSettingsRequest): Promise<OrgSettings> => {
      const response = await $api<ApiResponse<OrgSettings>>('/org/settings', {
        method: 'PATCH',
        body: payload,
      })
      return response.data
    },
    onSuccess: async (data) => {
      // A read still in flight was sent before the save, and would land the old value after it.
      await queryClient.cancelQueries({ queryKey: orgSettingsKeys.all })
      queryClient.setQueryData(orgSettingsKeys.all, data)
      success('settings.general.saved')
    },
  })
}
