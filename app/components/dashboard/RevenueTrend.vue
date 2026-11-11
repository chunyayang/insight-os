<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { MarketCode, RangeToken } from '~/types/api'
import { MARKETS, type MarketFilter } from '~/constants/markets'
import type { TrendSeries } from '~/components/charts/TrendLineChart.vue'

/**
 * 30-day revenue trend with market tabs.
 *
 * The market tabs are a DATA-SCOPE control: they flow into the query key and refetch.
 * Every line plots on one shared axis regardless of which market it represents, so all
 * of them render in the org's presentation currency (currency-model.md §3) — a
 * cross-market aggregate has no functional currency, and even a single-market line
 * must match the others' scale. Not the Analytics selector, which is scoped there.
 *
 * The tabs open on the default operating market, so the chart starts on the KPI cards'
 * market (spec §4.2) and follows it until a tab is picked. A picked tab stays in the
 * component and never writes back.
 */
const { t } = useI18n()
const fmt = useFormat()
const organization = useOrganizationStore()
const filters = useFiltersStore()
const preferences = usePreferencesStore()

// The default market until a tab is picked here, so the chart follows a change to the
// default as the KPI cards do.
const picked = ref<MarketFilter>()
const market = computed(() => picked.value ?? preferences.defaultMarket)
const { data, isPending, isError, error, refetch } = useRevenueSeries({ market })

// The query scopes itself to the global range, so the title names that range rather
// than assuming 30 days. Keyed by RangeToken so a new token can't ship without a label.
const PERIOD_KEY: Record<RangeToken, string> = {
  '7d': 'dashboard.revenueTrend.period.last7Days',
  '30d': 'dashboard.revenueTrend.period.last30Days',
  '90d': 'dashboard.revenueTrend.period.last90Days',
  mtd: 'dashboard.revenueTrend.period.monthToDate',
  ytd: 'dashboard.revenueTrend.period.yearToDate',
}
const period = computed(() => t(PERIOD_KEY[filters.range]))

// The server buckets every series by UTC day, so the title names the zone the dates are in
// rather than letting them read as local (`/product-spec` → `timezone-utc-buckets-for-mvp.md`).
const zone = computed(() => t('common.timeZones.utc'))

// Tabs are compact, so they read market codes (US/JP/TW/DE) rather than full
// names — `common.marketCode` covers "All" too, so the filter list needs no
// special-cased first entry.
const tabs = computed<TabsItem[]>(() =>
  (['All', ...MARKETS] as const).map((m) => ({
    label: t(`common.marketCode.${m.toLowerCase()}`),
    value: m,
  })),
)

// The title already names the period, so axis and tooltip dates drop the year.
const labels = computed(() => data.value?.series[0]?.points.map((p) => fmt.monthDay(p.t)) ?? [])

const series = computed<TrendSeries[]>(
  () =>
    data.value?.series.map((s) => ({
      label: t(`common.marketCode.${s.market.toLowerCase()}`),
      market: s.market as MarketCode,
      // Read the presentation-currency key out of each point's Money map — no
      // client-side conversion.
      data: s.points.map((p) => p.value[organization.presentationCurrency]),
    })) ?? [],
)

const chartSummary = computed(() =>
  t('dashboard.revenueTrend.chartSummary', {
    days: labels.value.length,
    zone: zone.value,
    currency: organization.presentationCurrency,
  }),
)
</script>

<template>
  <!-- No divider under the header, like the AI summary beside it. The tooltip can run past
       the chart's edge, so the card must not clip it. -->
  <UCard
    as="section"
    aria-labelledby="trend-heading"
    :ui="{
      root: 'min-w-0 divide-y-0 overflow-visible',
      header: 'flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-0 sm:px-5',
      body: 'p-5 pt-4 sm:p-5 sm:pt-4',
    }"
  >
    <template #header>
      <h2 id="trend-heading" class="trend__title">
        {{ t('dashboard.revenueTrend.title') }}
        <span class="trend__period">
          {{ t('dashboard.revenueTrend.periodInZone', { period, zone }) }}
        </span>
      </h2>
      <!--
        `:content="false"` makes this a toggle-only tablist: the chart below is the
        panel, and it is one element re-fetched per market rather than four mounted
        panels. Not `v-model`, because UTabs types its value as `string | number` and
        writing that straight back into a `Ref<MarketFilter>` doesn't type-check; the
        cast is safe since every `value` above comes from MARKETS.
        The tablist takes its context from the section heading — Nuxt UI renders the
        list inside its root, so a fallthrough `aria-label` would land on the wrapper
        rather than on the element with `role="tablist"`.
        The active tab is a tint with a colored label, like the sidebar's active link;
        inactive labels sit on bg-elevated, where only text-toned holds WCAG AA.
      -->
      <UTabs
        :model-value="market"
        :items="tabs"
        :content="false"
        :ui="{
          indicator: 'bg-primary/12 shadow-none',
          trigger: 'data-[state=active]:text-primary data-[state=inactive]:text-toned',
        }"
        size="sm"
        @update:model-value="picked = $event as MarketFilter"
      />
    </template>

    <!-- Three-state floor: skeleton / error+retry / chart. -->
    <USkeleton v-if="isPending" class="h-72 rounded-xl" />
    <CommonErrorState v-else-if="isError" :error="error" @retry="refetch()" />
    <ChartsTrendLineChart
      v-else
      :labels="labels"
      :series="series"
      :summary="chartSummary"
      :currency="organization.presentationCurrency"
      :fill="series.length === 1"
    />
  </UCard>
</template>

<style scoped>
.trend__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ui-text-highlighted);
}

.trend__period {
  font-weight: 400;
  color: var(--ui-text-muted);
}

/* The separator is typography, not copy, so it stays out of the translations. */
.trend__period::before {
  content: '· ';
}
</style>
