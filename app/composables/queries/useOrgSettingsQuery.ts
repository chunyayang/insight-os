import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, OrgSettings } from '~/types/api'

export const orgSettingsKeys = {
  all: ['org-settings'] as const,
}

/**
 * Organization config. Called once from the authenticated layout to seed the
 * organization store at session start (spec §4.10) — every other surface reads
 * `useOrganizationStore()` directly rather than this query, so reading a seeded
 * setting never triggers a request.
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
      const response = await $api.get<ApiResponse<OrgSettings>>('/settings/org')
      return response.data.data
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
