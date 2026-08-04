<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Customer, CustomerSegment, CustomerStatus, ListQuery } from '~/types/api'
import type { CsvExport } from '~/utils/csv'
import { MARKETS, type MarketFilter } from '~/constants/markets'

/**
 * Customer list — the first real consumer of CommonDataTable.
 *
 * There is deliberately NO currency selector on this page. Every LTV renders in its own
 * customer's market currency and is unaffected by the Analytics-scoped selector: a control
 * that isn't visible here must never silently change these numbers.
 */
const { t } = useI18n()
const fmt = useFormat()
const filters = useFiltersStore()

const SEGMENTS: CustomerSegment[] = ['vip', 'loyal', 'new', 'at-risk']
const SEGMENT_KEY: Record<CustomerSegment, string> = {
  vip: 'vip',
  loyal: 'loyal',
  new: 'new',
  'at-risk': 'atRisk',
}

const STATUS_COLOR: Record<CustomerStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  dormant: 'warning',
  churned: 'neutral',
}

/* ─────────────────────────── Query state ─────────────────────────── */

/**
 * The single `ListQuery` that goes on the wire. DataTable writes `page`, `sort` and `order`
 * into it; the filter controls below write the rest. Market comes from the global Pinia
 * filter so the app-wide market scope stays consistent — the select here is a view onto it,
 * not a second source of truth.
 */
const query = ref<ListQuery>({
  page: 1,
  pageSize: 20,
  market: filters.market,
  sort: 'lastActiveAt',
  order: 'desc',
})

const search = ref('')
const segment = ref<CustomerSegment | 'all'>('all')

/** Any filter change resets to page 1 — page 7 of a two-page result renders nothing. */
function applyFilters() {
  query.value = {
    ...query.value,
    q: search.value.trim() || undefined,
    segment: segment.value === 'all' ? undefined : segment.value,
    market: filters.market,
    page: 1,
  }
}

// Debounced so a search term costs one request instead of one per keystroke.
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

watch([segment, () => filters.market], applyFilters)

const { data, isFetching, isError, error, refetch } = useCustomersList(query)

const rows = computed(() => data.value?.data ?? [])

/* ─────────────────────────── Columns ─────────────────────────── */

/**
 * Explicit `size` on every column: pinning the name column positions the rest by measured
 * offset, so an unsized column would collapse the sticky layout on narrow viewports.
 * `enableSorting` is set only where /api/customers can actually sort.
 */
const columns = computed<TableColumn<Customer>[]>(() => [
  { accessorKey: 'name', header: t('customers.columns.name'), enableSorting: true, size: 240 },
  { accessorKey: 'market', header: t('customers.columns.market'), size: 130 },
  {
    accessorKey: 'lifetimeValue',
    header: t('customers.columns.lifetimeValue'),
    enableSorting: true,
    size: 170,
  },
  {
    accessorKey: 'totalOrders',
    header: t('customers.columns.totalOrders'),
    enableSorting: true,
    size: 140,
  },
  {
    accessorKey: 'lastActiveAt',
    header: t('customers.columns.lastActive'),
    enableSorting: true,
    size: 170,
  },
  { accessorKey: 'status', header: t('customers.columns.status'), size: 130 },
])

const segmentItems = computed(() => [
  { label: t('customers.filters.allSegments'), value: 'all' },
  ...SEGMENTS.map((value) => ({ label: t(`customers.segments.${SEGMENT_KEY[value]}`), value })),
])

const marketItems = computed(() => [
  { label: t('common.markets.all'), value: 'All' },
  ...MARKETS.map((code) => ({ label: t(`common.markets.${code.toLowerCase()}`), value: code })),
])

/* ─────────────────────────── CSV ─────────────────────────── */

/**
 * The export reads raw values, not the rendered cells: the amount goes out as a number with
 * its currency in its own column, and the timestamp as ISO. A spreadsheet can sum the first
 * and parse the second; it can do neither with "¥1,234" or "5 days ago".
 */
const csv = computed<CsvExport<Customer>>(() => ({
  filename: 'customers',
  columns: [
    { key: 'name', label: t('customers.columns.name'), value: (row) => row.name },
    { key: 'email', label: t('customers.columns.email'), value: (row) => row.email },
    { key: 'market', label: t('customers.columns.market'), value: (row) => row.market },
    { key: 'segment', label: t('customers.columns.segment'), value: (row) => row.segment },
    {
      key: 'lifetimeValue',
      label: t('customers.columns.lifetimeValue'),
      value: (row) => row.lifetimeValue[row.nativeCurrency],
    },
    { key: 'currency', label: t('customers.columns.currency'), value: (row) => row.nativeCurrency },
    {
      key: 'totalOrders',
      label: t('customers.columns.totalOrders'),
      value: (row) => row.totalOrders,
    },
    {
      key: 'lastActiveAt',
      label: t('customers.columns.lastActive'),
      value: (row) => row.lastActiveAt,
    },
    { key: 'status', label: t('customers.columns.status'), value: (row) => row.status },
  ],
}))
</script>

<template>
  <CommonDataTable
    v-model:query="query"
    :columns="columns"
    :rows="rows"
    :pagination="data?.pagination"
    :loading="isFetching"
    :error="isError ? error : undefined"
    :caption="t('customers.list.caption')"
    :pinned-columns="['name']"
    empty-icon="i-lucide-users"
    :empty-title="t('customers.list.emptyTitle')"
    :empty-description="t('customers.list.emptyDescription')"
    :csv="csv"
    @retry="refetch()"
  >
    <template #toolbar>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        size="sm"
        :placeholder="t('customers.filters.searchPlaceholder')"
        :aria-label="t('customers.filters.search')"
        class="customers__search"
      />
      <USelect
        v-model="segment"
        :items="segmentItems"
        size="sm"
        :aria-label="t('customers.filters.segment')"
      />
      <USelect
        :model-value="filters.market"
        :items="marketItems"
        size="sm"
        :aria-label="t('customers.filters.market')"
        @update:model-value="filters.setMarket($event as MarketFilter)"
      />
    </template>

    <template #name-cell="{ row }">
      <div class="customers__name">
        <span class="customers__name-primary">{{ row.original.name }}</span>
        <span class="customers__email">{{ row.original.email }}</span>
      </div>
    </template>

    <template #market-cell="{ row }">
      <UBadge color="neutral" variant="subtle" :label="row.original.market" />
    </template>

    <!-- Native currency per record — the market column beside it says which one. -->
    <template #lifetimeValue-cell="{ row }">
      <span class="customers__money">
        {{
          fmt.currency(
            row.original.lifetimeValue[row.original.nativeCurrency],
            row.original.nativeCurrency,
          )
        }}
      </span>
    </template>

    <template #totalOrders-cell="{ row }">
      {{ fmt.number(row.original.totalOrders) }}
    </template>

    <template #lastActiveAt-cell="{ row }">
      <time :datetime="row.original.lastActiveAt" :title="fmt.dateTime(row.original.lastActiveAt)">
        {{ fmt.relativeTime(row.original.lastActiveAt) }}
      </time>
    </template>

    <template #status-cell="{ row }">
      <UBadge
        :color="STATUS_COLOR[row.original.status as CustomerStatus]"
        variant="subtle"
        :label="t(`customers.statuses.${row.original.status}`)"
      />
    </template>
  </CommonDataTable>
</template>

<style scoped>
.customers__search {
  min-width: 14rem;
}

.customers__name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.customers__name-primary {
  color: var(--ui-text-highlighted);
  font-weight: 600;
}

.customers__email {
  color: var(--ui-text-dimmed);
  font-size: 0.8125rem;
}

.customers__money {
  color: var(--ui-text-highlighted);
  font-variant-numeric: tabular-nums;
}
</style>
