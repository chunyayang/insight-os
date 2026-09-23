<script setup lang="ts">
import type { ChartOption } from '~/utils/echarts'
import type { CurrencyCode, MarketCode } from '~/types/api'

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
  summary: string
  height?: string
  /** Render as a filled area (single-series trends read better filled). */
  fill?: boolean
  /** Every value is money in this currency; the axis and tooltip format it as such. */
  currency?: CurrencyCode
}>()

const { theme, colorForMarket, colorAt } = useChartTheme()
const fmt = useFormat()
const { locale } = useI18n()

const option = computed<ChartOption>(() => {
  // ECharts calls these formatters at paint time, outside Vue's tracking. Reading the
  // locale here rebuilds the option, and so repaints them, when the language switches.
  void locale.value
  const { currency } = props
  const formatValue = (value: number) =>
    currency ? fmt.currency(value, currency) : fmt.number(value)
  const formatAxis = (value: number) =>
    currency ? fmt.compactCurrency(value, currency) : fmt.compact(value)

  return {
    legend: {
      show: props.series.length > 1,
      // Pinned to the band `grid.top` reserves; ECharts 6 otherwise lays it over the x-axis.
      top: 0,
      textStyle: { color: theme.value.text },
      icon: 'circle',
    },
    grid: {
      left: 8,
      right: 8,
      top: props.series.length > 1 ? 32 : 8,
      bottom: 8,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.value.surface,
      borderColor: theme.value.grid,
      textStyle: { color: theme.value.text },
      valueFormatter: (value) => (typeof value === 'number' ? formatValue(value) : String(value)),
    },
    xAxis: {
      type: 'category',
      data: props.labels,
      axisLine: { lineStyle: { color: theme.value.grid } },
      axisTick: { show: false },
      axisLabel: { color: theme.value.text, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: theme.value.grid } },
      axisLabel: { color: theme.value.text, formatter: formatAxis },
    },
    series: props.series.map((s, i) => {
      const color = s.market ? colorForMarket(s.market) : colorAt(i)
      return {
        type: 'line',
        name: s.label,
        data: s.data,
        color,
        smooth: 0.4,
        symbolSize: 8,
        showSymbol: false,
        // The gradient carries its own alpha; ECharts' 0.7 default would fade it twice.
        areaStyle: props.fill ? { color: areaGradient(color), opacity: 1 } : undefined,
      }
    }),
  }
})
</script>

<template>
  <ChartsBaseChart :option="option" :summary="summary" :height="height ?? '18rem'" />
</template>
