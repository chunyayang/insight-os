<script setup lang="ts" generic="T extends TableData">
import type { TableColumn, TableData } from '@nuxt/ui'
import type { ApiListResponse, ListQuery } from '~/types/api'
import { csvFilename, downloadCsv, toCsv, type CsvExport } from '~/utils/csv'

/**
 * The project's one table. Pages and feature components never reach for `UTable` directly.
 *
 * What makes it more than a pass-through: it is bound to the API contract rather than to a
 * row array. `query` is the `ListQuery` that goes on the wire and `pagination` is the
 * envelope's own block off `ApiListResponse`, so sorting and paging are SERVER concerns —
 * the component writes back into `query` and the caller's Vue Query composable refetches.
 * `manualSorting` / `manualPagination` tell TanStack to keep its hands off, which is the
 * whole point: without them a 20-row page would silently sort and slice itself and pretend
 * to be the entire result set.
 *
 * Sorting therefore always happens on the server against the RAW field. Money cells render
 * per record in their native currency, and mixed-currency sorting is currency-blind by
 * design in the MVP (see the product spec, Customers) — never coerce formatted strings back
 * into numbers to paper over that.
 */
const props = defineProps<{
  columns: TableColumn<T>[]
  rows: T[]
  /** Straight off `ApiListResponse.pagination`. Absent while the first page loads. */
  pagination?: ApiListResponse<T>['pagination']
  loading?: boolean
  error?: unknown
  /**
   * Column ids pinned to the left — the "sticky first columns on smaller viewports" rule.
   * Pinning positions cells by measured offset, so every column needs an explicit `size`.
   * Harmless at desktop widths: with nothing overflowing, nothing has anywhere to stick to.
   */
  pinnedColumns?: string[]
  /** Localized table summary. Rendered as a visually-hidden <caption> for screen readers. */
  caption: string
  emptyIcon?: string
  emptyTitle?: string
  emptyDescription?: string
  /** Omit to leave the export control out of the toolbar entirely. */
  csv?: CsvExport<T>
}>()

const emit = defineEmits<{ retry: [] }>()

const query = defineModel<ListQuery>('query', { required: true })

const { t } = useI18n()
const fmt = useFormat()
const { can, shouldRender } = useCan()
const slots = useSlots()

const UButton = resolveComponent('UButton')

/* ─────────────────────────── Sorting ─────────────────────────── */

function columnId(column: TableColumn<T>): string {
  if (column.id) return column.id
  return 'accessorKey' in column ? String(column.accessorKey) : ''
}

/** UTable's sorting state, projected onto the wire params in both directions. */
const sorting = computed({
  get: () =>
    query.value.sort ? [{ id: query.value.sort, desc: query.value.order === 'desc' }] : [],
  set: (next) => {
    const first = next[0]
    query.value = {
      ...query.value,
      sort: first?.id,
      order: first ? (first.desc ? 'desc' : 'asc') : undefined,
      // A different ordering makes the current page number meaningless.
      page: 1,
    }
  },
})

/** asc → desc → unsorted, so a user can always get back to the endpoint's own default. */
function toggleSort(id: string) {
  if (query.value.sort !== id) sorting.value = [{ id, desc: false }]
  else if (query.value.order === 'asc') sorting.value = [{ id, desc: true }]
  else sorting.value = []
}

function sortIcon(id: string): string {
  if (query.value.sort !== id) return 'i-lucide-chevrons-up-down'
  return query.value.order === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

/**
 * Sorting is opt-in per column (`enableSorting: true`) because the ENDPOINT has to support
 * the field — a header that sorts nothing is worse than no header control at all. Opting in
 * swaps the plain string header for a toggle button; everything else passes through.
 */
const tableColumns = computed<TableColumn<T>[]>(() =>
  props.columns.map((column) => {
    if (column.enableSorting !== true || typeof column.header !== 'string') return column

    const label = column.header
    const id = columnId(column)

    // Cast: spreading ColumnDef's discriminated union widens it past TS's ability to
    // re-narrow, though the shape is unchanged apart from `header`.
    return {
      ...column,
      header: () =>
        h(UButton, {
          label,
          color: 'neutral',
          variant: 'ghost',
          size: 'sm',
          icon: sortIcon(id),
          trailing: true,
          // Pull the ghost button's padding back so headers line up with their cells.
          class: '-mx-2.5',
          'aria-label': t('common.table.sortBy', { column: label }),
          onClick: () => toggleSort(id),
        }),
    } as TableColumn<T>
  }),
)

/* ─────────────────────────── Pagination ─────────────────────────── */

const page = computed({
  get: () => query.value.page ?? 1,
  set: (next: number) => {
    query.value = { ...query.value, page: next }
  },
})

/** Rows are counted from the RESPONSE, so the label never claims a page that isn't loaded. */
const showing = computed(() => {
  const meta = props.pagination
  if (!meta || meta.total === 0) return ''
  const from = (meta.page - 1) * meta.pageSize + 1
  return t('common.table.showing', {
    from: fmt.number(from),
    to: fmt.number(Math.min(meta.page * meta.pageSize, meta.total)),
    total: fmt.number(meta.total),
  })
})

/* ─────────────────────────── CSV export ─────────────────────────── */

/**
 * `export:csv` is the one ability the spec marks *disabled + tooltip* rather than hidden,
 * so the control renders for every role and `shouldRender` keeps that decision in the
 * permission map instead of here. Client-side gating is UX only — the real backend export
 * must re-check the role.
 */
const canExport = computed(() => can('export:csv'))
const exportDisabled = computed(
  () => !canExport.value || Boolean(props.loading) || props.rows.length === 0,
)
const exportTooltip = computed(() =>
  canExport.value ? t('common.table.exportCsvHint') : t('common.table.exportDenied'),
)

/** Exports the loaded page. A whole-result export needs a `?format=csv` endpoint variant. */
function exportCsv() {
  if (!props.csv || exportDisabled.value) return
  downloadCsv(csvFilename(props.csv.filename), toCsv(props.rows, props.csv.columns))
}

/* ─────────────────────────── Slots ─────────────────────────── */

/**
 * Forward `#<column>-cell` / `#<column>-header` straight through to UTable. The three below
 * are ours: each is declared once with a default a caller can override, so forwarding them
 * as well would declare the same slot name twice.
 */
const OWN_SLOTS = ['toolbar', 'empty', 'loading']
const forwardedSlots = computed(() =>
  Object.keys(slots).filter((name) => !OWN_SLOTS.includes(name)),
)
</script>

<template>
  <div class="data-table">
    <div v-if="$slots.toolbar || csv" class="data-table__toolbar">
      <div class="data-table__filters">
        <slot name="toolbar" />
      </div>

      <UTooltip v-if="csv && shouldRender('export:csv')" :text="exportTooltip">
        <!-- A disabled <button> swallows pointer events, so the tooltip would never open
             for the role the tooltip exists to explain things to. The wrapper hears them
             instead. -->
        <span class="data-table__export">
          <UButton
            :label="t('common.table.exportCsv')"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="exportDisabled"
            @click="exportCsv"
          />
        </span>
      </UTooltip>
    </div>

    <CommonErrorState v-if="error" :error="error" @retry="emit('retry')" />

    <template v-else>
      <UTable
        v-model:sorting="sorting"
        :data="rows"
        :columns="tableColumns"
        :caption="caption"
        :loading="loading"
        :column-pinning="{ left: pinnedColumns ?? [] }"
        :sorting-options="{ manualSorting: true }"
        :pagination-options="{
          manualPagination: true,
          rowCount: pagination?.total ?? rows.length,
        }"
      >
        <template v-for="name in forwardedSlots" :key="name" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps ?? {}" />
        </template>

        <!-- First load has no rows to draw yet, so stand in for them rather than flashing
             the empty state at someone whose data is still on the wire. -->
        <template #loading>
          <slot name="loading">
            <div class="data-table__skeleton">
              <USkeleton v-for="n in 5" :key="n" class="h-8 w-full" />
            </div>
          </slot>
        </template>

        <template #empty>
          <slot name="empty">
            <UEmpty
              :icon="emptyIcon ?? 'i-lucide-inbox'"
              :title="emptyTitle ?? t('common.states.empty')"
              :description="emptyDescription"
            />
          </slot>
        </template>
      </UTable>

      <div v-if="showing" class="data-table__footer">
        <p class="data-table__count">{{ showing }}</p>
        <UPagination
          v-if="pagination && pagination.totalPages > 1"
          v-model:page="page"
          :items-per-page="pagination.pageSize"
          :total="pagination.total"
          :sibling-count="1"
          :disabled="loading"
          size="sm"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.data-table {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  /* Clips the table's own horizontal scroll to the card's rounded edge. */
  overflow: hidden;
}

.data-table__toolbar {
  display: flex;
  flex-wrap: wrap; /* zh-TW labels run long — let the export button wrap, never clip. */
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-block-end: 1px solid var(--ui-border);
}

.data-table__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.data-table__skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.data-table__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-block-start: 1px solid var(--ui-border);
}

.data-table__count {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
