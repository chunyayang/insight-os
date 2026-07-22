<script setup lang="ts">
import type { MarketCode } from '~/types/api'
import { MARKETS, type MarketFilter } from '~/constants/markets'
import type { TrendSeries } from '~/components/charts/TrendLineChart.vue'

/**
 * 30-day revenue trend with market tabs.
 *
 * The market tabs are a DATA-SCOPE control: they flow into the query key and refetch.
 * Amounts render in USD here because the Dashboard is not Analytics — the currency
 * selector lives only there, and a control that isn't on this page must never change
 * this page's numbers.
 */
const { t } = useI18n()
const fmt = useFormat()

const market = ref<MarketFilter>('All')
const { data, isPending, isError, error, refetch } = useRevenueSeries({ market })

const tabs = computed(() => [
  { label: t('dashboard.revenueTrend.allMarkets'), value: 'All' as MarketFilter },
  ...MARKETS.map((m) => ({
    label: t(`common.markets.${m.toLowerCase()}`),
    value: m as MarketFilter,
  })),
])

const labels = computed(() => data.value?.series[0]?.points.map((p) => fmt.date(p.t)) ?? [])

const series = computed<TrendSeries[]>(
  () =>
    data.value?.series.map((s) => ({
      label: t(`common.markets.${s.market.toLowerCase()}`),
      market: s.market as MarketCode,
      // Read the USD key out of each point's Money map — no client-side conversion.
      data: s.points.map((p) => p.value.USD),
    })) ?? [],
)

const chartSummary = computed(() =>
  t('dashboard.revenueTrend.chartSummary', {
    days: labels.value.length,
    currency: 'USD',
  }),
)
</script>

<template>
  <section class="trend" aria-labelledby="trend-heading">
    <header class="trend__header">
      <h2 id="trend-heading" class="trend__title">{{ t('dashboard.revenueTrend.title') }}</h2>
      <SelectButton
        v-model="market"
        :options="tabs"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
        :aria-label="t('dashboard.revenueTrend.title')"
      />
    </header>

    <!-- Three-state floor: skeleton / error+retry / chart. -->
    <Skeleton v-if="isPending" height="18rem" />
    <CommonErrorState v-else-if="isError" :error="error" @retry="refetch()" />
    <ChartsTrendLineChart
      v-else
      :labels="labels"
      :series="series"
      :summary="chartSummary"
      :fill="series.length === 1"
    />
  </section>
</template>

<style scoped>
.trend {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
  padding: 1.25rem;
  min-width: 0;
}

.trend__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-block-end: 1rem;
}

.trend__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}
</style>
