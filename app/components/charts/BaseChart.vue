<script setup lang="ts">
import { Chart, type ChartConfiguration, type ChartType } from 'chart.js'

/**
 * Owns the Chart.js instance lifecycle. Pages never import Chart.js directly — they use
 * a wrapper in components/charts/, and those wrappers build on this one.
 *
 * Accessibility: the canvas is aria-hidden and the figure carries a text summary, so a
 * screen reader gets the meaning instead of an opaque canvas element.
 */
const props = defineProps<{
  type: ChartType
  data: ChartConfiguration['data']
  options?: ChartConfiguration['options']
  /** Localized text summary of what the chart shows — required, not optional. */
  summary: string
  height?: string
}>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
let chart: Chart | null = null

function render() {
  if (!canvas.value) return
  chart?.destroy()
  chart = new Chart(canvas.value, {
    type: props.type,
    data: props.data,
    options: props.options,
  })
}

onMounted(render)

// Rebuild when the data or the resolved (theme-dependent) options change. A full
// re-create keeps it simple and correct; these datasets are small.
watch(() => [props.data, props.options], render, { deep: true })

onBeforeUnmount(() => {
  chart?.destroy()
  chart = null
})
</script>

<template>
  <figure class="chart" :style="height ? { height } : undefined">
    <canvas ref="canvas" aria-hidden="true" />
    <figcaption class="chart__caption">{{ summary }}</figcaption>
  </figure>
</template>

<style scoped>
.chart {
  position: relative;
  width: 100%;
  min-width: 0;
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
