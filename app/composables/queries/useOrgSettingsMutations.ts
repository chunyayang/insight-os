import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { ApiResponse, OrgSettings, UpdateOrgSettingsRequest } from '~/types/api'
import { orgSettingsKeys } from './useOrgSettingsQuery'

/**
 * Settings → General is the only writer of organization config. On success the store
 * is seeded directly — every other surface reads it live, with no reason to wait on a
 * refetch — and the query is invalidated so a later reload confirms the same value.
 */
export function useUpdatePresentationCurrencyMutation() {
  const { $api } = useNuxtApp()
  const organization = useOrganizationStore()
  const queryClient = useQueryClient()
  const { success } = useNotify()

  return useMutation({
    mutationFn: async (payload: UpdateOrgSettingsRequest): Promise<OrgSettings> => {
      const response = await $api.patch<ApiResponse<OrgSettings>>('/settings/org', payload)
      return response.data.data
    },
    onSuccess: (data) => {
      organization.setPresentationCurrency(data.presentationCurrency)
      queryClient.invalidateQueries({ queryKey: orgSettingsKeys.all })
      success('settings.general.saved')
    },
  })
}
