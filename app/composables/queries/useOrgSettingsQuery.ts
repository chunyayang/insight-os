import { useQuery } from '@tanstack/vue-query'
import type { ApiResponse, OrgSettings } from '~/types/api'

export const orgSettingsKeys = {
  all: ['org-settings'] as const,
}

/**
 * Organization config, which seeds the organization store (spec §4.10). Called only by the
 * authenticated layout, which renders no page until it settles. Every surface reads
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
    // Organization policy, changed rarely (spec §4.10), and an Admin's save writes its
    // response into the cache. Other sessions pick up a change on their next page load,
    // which SSR fetches fresh.
    staleTime: Infinity,
  })

  // Synchronous, so the store holds the currency before the layout, gated on this query's
  // status, renders the page.
  watch(
    () => query.data.value,
    (data) => {
      if (data) organization.setPresentationCurrency(data.presentationCurrency)
    },
    { immediate: true, flush: 'sync' },
  )

  return query
}
