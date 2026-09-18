import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, nextTick, ref, type Component } from 'vue'
import { UApp } from '#components'
import type { TableColumn } from '@nuxt/ui'
import DataTable from '../../app/components/common/DataTable.vue'
import { useAuthStore } from '../../app/stores/auth'
import type { ApiListResponse, ListQuery, Role } from '../../app/types/api'

interface Row extends Record<string, unknown> {
  id: string
  name: string
  amount: number
}

const rows: Row[] = [
  { id: 'r1', name: 'Ava Mitchell', amount: 8420 },
  { id: 'r2', name: '佐藤 陽菜', amount: 1_284_000 },
]

const columns: TableColumn<Row>[] = [
  { accessorKey: 'name', header: 'Customer', size: 200 },
  { accessorKey: 'amount', header: 'Lifetime value', enableSorting: true, size: 160 },
]

const pagination: ApiListResponse<Row>['pagination'] = {
  page: 1,
  pageSize: 20,
  total: 136,
  totalPages: 7,
}

/**
 * Mounts the table the way a feature component uses it: inside <UApp> (whose TooltipProvider
 * the export tooltip needs) and behind a `query` ref bound with v-model.
 *
 * The session is seeded from INSIDE the harness: the auth store resolves to the mounted app's
 * own Pinia, so signing in from the test scope seeds a different store than `useCan()` reads
 * and every role assertion silently runs as the default Viewer.
 */
async function mountTable(props: Record<string, unknown> = {}, role: Role = 'admin') {
  const query = ref<ListQuery>({ page: 1, pageSize: 20, ...((props.query as ListQuery) ?? {}) })
  const updates: ListQuery[] = []

  const harness = defineComponent({
    setup() {
      useAuthStore().signIn({
        token: `demo.${role}`,
        user: { id: 'u-1', name: 'Test User', email: 't@x.com', role },
      })

      return () =>
        h(UApp as Component, null, {
          default: () =>
            h(DataTable as Component, {
              columns,
              rows,
              pagination,
              caption: 'Customers',
              ...props,
              query: query.value,
              'onUpdate:query': (next: ListQuery) => {
                query.value = next
                updates.push(next)
              },
            }),
        })
    },
  })

  return { wrapper: await mountSuspended(harness), updates }
}

function buttonWithText(wrapper: Awaited<ReturnType<typeof mountTable>>['wrapper'], text: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

describe('DataTable', () => {
  it('renders the rows it is handed, including CJK, and captions the table', async () => {
    const { wrapper } = await mountTable()
    expect(wrapper.text()).toContain('Ava Mitchell')
    expect(wrapper.text()).toContain('佐藤 陽菜')
    expect(wrapper.find('caption').text()).toBe('Customers')
  })

  it('reports the loaded page against the envelope total, not the row count', async () => {
    const { wrapper } = await mountTable()
    expect(wrapper.text()).toContain('1–20 of 136')
  })

  /** A sort click must reach the SERVER: wire params out, page reset, never a local reorder. */
  it('turns a sort click into wire params and resets to page 1', async () => {
    const { wrapper, updates } = await mountTable({ query: { page: 4, pageSize: 20 } })

    await wrapper.find('thead button').trigger('click')

    expect(updates.at(-1)).toMatchObject({ sort: 'amount', order: 'asc', page: 1 })
  })

  it('cycles a sorted column asc → desc → unsorted', async () => {
    const { wrapper, updates } = await mountTable({
      query: { page: 1, pageSize: 20, sort: 'amount', order: 'asc' },
    })

    await wrapper.find('thead button').trigger('click')
    expect(updates.at(-1)).toMatchObject({ sort: 'amount', order: 'desc' })

    await wrapper.find('thead button').trigger('click')
    // Back to the endpoint's own default ordering, not a third client-side state.
    expect(updates.at(-1)?.sort).toBeUndefined()
    expect(updates.at(-1)?.order).toBeUndefined()
  })

  it('offers no sort control on columns the endpoint cannot sort', async () => {
    // Only `amount` opts in via enableSorting, so exactly one header is interactive.
    const { wrapper } = await mountTable()
    expect(wrapper.findAll('thead button')).toHaveLength(1)
  })

  it('renders its empty state instead of a bare table when there are no rows', async () => {
    const { wrapper } = await mountTable({
      rows: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      emptyTitle: 'No customers match these filters',
    })

    expect(wrapper.text()).toContain('No customers match these filters')
    // No row count for an empty result — there is nothing to page through.
    expect(wrapper.text()).not.toContain('of 0')
  })

  it('replaces the table with a recoverable error state', async () => {
    const { wrapper } = await mountTable({
      error: { error: { code: 'SERVER_ERROR', message: 'boom' } },
    })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
    // The raw server message is never shown; copy is localized off the code.
    expect(wrapper.text()).not.toContain('boom')
  })

  describe('CSV export permission gate', () => {
    const csv = {
      filename: 'customers',
      columns: [{ key: 'name', label: 'Customer', value: (row: Row) => row.name }],
    }

    it('is omitted entirely when no export config is supplied', async () => {
      const { wrapper } = await mountTable()
      expect(wrapper.text()).not.toContain('Export CSV')
    })

    it('is enabled for a role that holds export:csv', async () => {
      const { wrapper } = await mountTable({ csv })
      expect(buttonWithText(wrapper, 'Export CSV')?.attributes('disabled')).toBeUndefined()
    })

    /**
     * *Disabled + tooltip*, not hidden: the Viewer keeps the control and can learn why it is
     * inert. `aria-disabled` rather than `disabled` is what makes that reachable — a disabled
     * button leaves the tab order and emits nothing, so the explanation would exist for mouse
     * users alone.
     */
    it('stays visible but inert for a role that does not', async () => {
      const { wrapper } = await mountTable({ csv }, 'viewer')
      const button = buttonWithText(wrapper, 'Export CSV')

      expect(wrapper.text()).toContain('Export CSV')
      expect(button?.attributes('aria-disabled')).toBe('true')
      expect(button?.attributes('disabled')).toBeUndefined()
    })

    /** Touch has no hover and Reka's tooltip ignores it, so activation must say it out loud. */
    it('explains the denial when a Viewer activates it', async () => {
      const { wrapper } = await mountTable({ csv }, 'viewer')

      await buttonWithText(wrapper, 'Export CSV')?.trigger('click')
      await nextTick()

      expect(document.body.textContent).toContain("Your role can't export data.")
    })

    /** Mid-load there is nothing to explain, so the plain disabled treatment is right. */
    it('is plainly disabled for a permitted role while rows are loading', async () => {
      const { wrapper } = await mountTable({ csv, loading: true, rows: [] })
      const button = buttonWithText(wrapper, 'Export CSV')

      expect(button?.attributes('disabled')).toBeDefined()
      expect(button?.attributes('aria-disabled')).toBeUndefined()
    })
  })
})
