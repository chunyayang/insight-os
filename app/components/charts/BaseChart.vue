<script setup lang="ts">
import VChart from 'vue-echarts'
// Registers the ECharts modules; everything that renders a chart comes through here.
import '~/utils/echarts'
import type { ChartOption } from '~/utils/echarts'

/**
 * Owns the ECharts option lifecycle via `vue-echarts`'s `VChart`. Pages never import
 * ECharts directly — they use a wrapper in components/charts/, and those wrappers
 * build on this one.
 *
 * Accessibility: the chart root is aria-hidden and the figure carries a text summary,
 * so a screen reader gets the meaning instead of an opaque canvas element.
 */
const props = defineProps<{
  option: ChartOption
  /** Localized text summary of what the chart shows — required, not optional. */
  summary: string
  height?: string
}>()

const prefersReducedMotion = usePrefersReducedMotion()

// ECharts has no global animation default, so reduced motion is enforced here — once,
// for every chart — rather than left to each wrapper to remember.
const resolvedOption = computed<ChartOption>(() => ({
  ...props.option,
  animation: prefersReducedMotion.value ? false : props.option.animation,
}))
</script>

<template>
  <figure class="chart" :style="height ? { height } : undefined">
    <VChart class="chart__canvas" :option="resolvedOption" autoresize aria-hidden="true" />
    <figcaption class="chart__caption">{{ summary }}</figcaption>
  </figure>
</template>

<style scoped>
.chart {
  position: relative;
  width: 100%;
  min-width: 0;
}

.chart__canvas {
  width: 100%;
  height: 100%;
}

/* Visually hidden but available to assistive tech. */
.chart__caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
