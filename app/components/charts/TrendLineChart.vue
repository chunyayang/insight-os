<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'
import type { MarketCode } from '~/types/api'
import { withAlpha } from '~/composables/useChartTheme'

export interface TrendSeries {
  /** Already-localized series label. */
  label: string
  data: number[]
  /** When set, the series takes that market's fixed ramp colour. */
  market?: MarketCode
}

const props = defineProps<{
  labels: string[]
  series: TrendSeries[]
  ariaLabel: string
  height?: string
  /** Render as a filled area (single-series trends read better filled). */
  fill?: boolean
}>()

const { theme, colorForMarket, colorAt } = useChartTheme()

const data = computed<ChartConfiguration['data']>(() => ({
  labels: props.labels,
  datasets: props.series.map((s, i) => {
    const color = s.market ? colorForMarket(s.market) : colorAt(i)
    return {
      label: s.label,
      data: s.data,
      borderColor: color,
      backgroundColor: props.fill ? withAlpha(color, 0.18) : color,
      fill: props.fill ?? false,
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
    }
  }),
}))

const options = computed<ChartConfiguration['options']>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: props.series.length > 1,
      labels: { color: theme.value.text, usePointStyle: true, boxWidth: 8 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: theme.value.text, maxRotation: 0, autoSkipPadding: 16 },
      border: { color: theme.value.grid },
    },
    y: {
      grid: { color: theme.value.grid },
      ticks: { color: theme.value.text },
      border: { display: false },
    },
  },
}))
</script>

<template>
  <ChartsBaseChart
    type="line"
    :data="data"
    :options="options"
    :summary="ariaLabel"
    :height="height ?? '18rem'"
  />
</template>
