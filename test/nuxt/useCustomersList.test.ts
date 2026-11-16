import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { customerKeys, useCustomersList } from '../../app/composables/queries/useCustomersQuery'
import type { ApiListResponse, Customer, ListQuery } from '../../app/types/api'
import { withNuxtContext } from './support/context'

const requests: Record<string, string>[] = []
registerEndpoint('/api/customers', (event: { path: string }) => {
  requests.push(Object.fromEntries(new URL(event.path, 'http://x').searchParams))
  return {
    data: [],
    pagination: { page: 1, pageSize: 20, total: 0 },
  } as unknown as ApiListResponse<Customer>
})

describe('useCustomersList', () => {
  let unmount = () => {}

  beforeEach(() => {
    withNuxtContext(() => useQueryClient().clear())
    requests.length = 0
  })

  afterEach(() => unmount())

  it('refetches an inactive entry with the query in its key, not the one now in the ref', async () => {
    const query = ref<ListQuery>({ page: 2 })
    const wrapper = await mountSuspended(
      defineComponent({
        setup() {
          useCustomersList(query)
          return () => h('div')
        },
      }),
    )
    unmount = () => wrapper.unmount()
    await vi.waitFor(() => expect(requests).toEqual([{ page: '2' }]))

    query.value = { page: 1, market: 'JP' }
    await vi.waitFor(() => expect(requests.at(-1)).toEqual({ page: '1', market: 'JP' }))

    // The unfiltered page 2 is inactive now; refetching it must not fill it with JP's rows.
    // Exact match: a partial key would also match the JP entry, whose object contains `{}`.
    await withNuxtContext(() =>
      useQueryClient().refetchQueries({
        queryKey: customerKeys.list({ page: 2 }),
        exact: true,
        type: 'all',
      }),
    )
    expect(requests.at(-1)).toEqual({ page: '2' })
  })
})
