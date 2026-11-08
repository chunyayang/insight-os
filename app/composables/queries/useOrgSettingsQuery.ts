import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, OrgSettings } from '~/types/api'

export const orgSettingsKeys = {
  all: ['org-settings'] as const,
}

/**
 * Organization config, which seeds the organization store (spec §4.10). The authenticated
 * layout's call keeps the store seeded for the session; other callers want the loading
 * state, and their seed copies the same cached data. Every surface reads
 * `useOrganizationStore()` rather than this query, so reading a setting never requests it.
 *
 * `useQuery` in this Vue Query version has no `onSuccess`, so the seed is a `watch`
 * on the query's data instead of a callback.
 */
export function useOrgSettingsQuery() {
  const { $api } = useNuxtApp()
  const organization = useOrganizationStore()

  const query = useQuery({
    queryKey: orgSettingsKeys.all,
    queryFn: async () => {
      const response = await $api<ApiResponse<OrgSettings>>('/settings/org')
      return response.data
    },
  })

  watch(
    () => query.data.value,
    (data) => {
      if (data) organization.setPresentationCurrency(data.presentationCurrency)
    },
    { immediate: true },
  )

  return query
}
