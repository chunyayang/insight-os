<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js'

/**
 * Tiny inline trend for KPI tiles — no axes, no legend, no tooltip.
 *
 * A sparkline is shape-only and therefore currency-independent, which is why the API
 * returns it as a plain number[] even for monetary KPIs.
 */
const props = defineProps<{
  data: number[]
  summary: string
  /** Ramp index, or a semantic direction colour for trend emphasis. */
  colorIndex?: number
  trend?: 'up' | 'down' | 'neutral'
}>()

const { theme, colorAt } = useChartTheme()

const strokeColor = computed(() => {
  // Resolved token VALUES, not var() — Chart.js paints to canvas and cannot resolve
  // CSS custom properties. Trend direction carries meaning, so it uses the semantic
  // colours rather than the categorical ramp (which distinguishes series, not status).
  if (props.trend === 'up') return theme.value.positive
  if (props.trend === 'down') return theme.value.negative
  return colorAt(props.colorIndex ?? 0)
})

const data = computed<ChartConfiguration['data']>(() => ({
  labels: props.data.map((_, i) => String(i)),
  datasets: [
    {
      data: props.data,
      borderColor: strokeColor.value,
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
      fill: false,
    },
  ],
}))

const options = computed<ChartConfiguration['options']>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { line: { borderJoinStyle: 'round' } },
}))
</script>

<template>
  <ChartsBaseChart type="line" :data="data" :options="options" :summary="summary" height="2.5rem" />
</template>
