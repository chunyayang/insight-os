import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { ApiListResponse, Customer, ListQuery } from '~/types/api'

/**
 * Query-key factory for the customers domain. The whole `ListQuery` is part of the key:
 * page, sort and every filter are data-scope params here, so each combination is its own
 * cache entry and any change refetches.
 */
export const customerKeys = {
  all: ['customers'] as const,
  list: (query: ListQuery) => [...customerKeys.all, 'list', { ...query }] as const,
}

/**
 * The Customers list. Returns the FULL envelope rather than just the rows — the table needs
 * `pagination.total` to size its pager, and a page of rows can't tell it how many there are.
 */
export function useCustomersList(query: Ref<ListQuery>) {
  const { $api } = useNuxtApp()

  return useQuery({
    queryKey: computed(() => customerKeys.list(query.value)),
    queryFn: async () => {
      const response = await $api.get<ApiListResponse<Customer>>('/customers', {
        params: query.value,
      })
      return response.data
    },
    /**
     * Hold the current page on screen while the next one loads. Without it every page
     * change empties the table for the length of a round trip, so the layout collapses to
     * the empty state and back — reading as a bug rather than as loading.
     */
    placeholderData: keepPreviousData,
  })
}
