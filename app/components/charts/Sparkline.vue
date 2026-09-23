<script setup lang="ts">
import type { ChartOption } from '~/utils/echarts'

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
  // Resolved token VALUES, not var() — zrender's color parser cannot resolve CSS
  // custom properties. Trend direction carries meaning, so it uses the semantic
  // colours rather than the categorical ramp (which distinguishes series, not status).
  if (props.trend === 'up') return theme.value.positive
  if (props.trend === 'down') return theme.value.negative
  return colorAt(props.colorIndex ?? 0)
})

const option = computed<ChartOption>(() => ({
  grid: { left: 0, right: 0, top: 0, bottom: 0 },
  tooltip: { show: false },
  xAxis: {
    type: 'category',
    show: false,
    data: props.data.map((_, i) => String(i)),
  },
  // Fit the axis to the data: a sparkline is shape-only, and a zero baseline flattens
  // a series that moves a few percent around a large value into a few pixels.
  yAxis: { type: 'value', show: false, scale: true },
  series: [
    {
      type: 'line',
      data: props.data,
      color: strokeColor.value,
      lineStyle: { width: 1.5, join: 'round' },
      smooth: 0.4,
      showSymbol: false,
    },
  ],
}))
</script>

<template>
  <ChartsBaseChart :option="option" :summary="summary" height="2.5rem" />
</template>
