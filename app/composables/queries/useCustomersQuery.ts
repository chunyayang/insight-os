import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import type { ApiListResponse, Customer, ListQuery } from '~/types/api'

/**
 * Query-key factory for the customers domain. The whole `ListQuery` is part of the key: page,
 * sort and every filter are data-scope params, so each combination is its own cache entry.
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
     * Hold the current page on screen while the next one loads. Without it every page change
     * collapses the table to its empty state for a round trip, which reads as a bug.
     */
    placeholderData: keepPreviousData,
  })
}
