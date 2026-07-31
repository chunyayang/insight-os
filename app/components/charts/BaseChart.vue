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

/**
 * Hand Chart.js plain arrays, never Vue proxies.
 *
 * Series data originates in Vue Query, which exposes its cache as `readonly()`. Chart.js
 * keeps a reference to each dataset (`meta._dataset`) and mutates its own `_metasets`
 * around it — `delete _metasets[i]` on teardown, `push` on rebuild. Reached through a
 * readonly proxy those writes silently fail, and Vue logs "Set operation on key … failed:
 * target is readonly" on every re-render. The chart still draws (Chart.js rebuilds from
 * the config), so this is dev-only console noise — but it drowns out real warnings.
 *
 * Unwrapping the three levels Chart.js actually writes through is enough; everything else
 * is copied by reference, so non-serialisable values in a dataset would survive (a JSON
 * round-trip would quietly drop them).
 */
function toPlainData(data: ChartConfiguration['data']): ChartConfiguration['data'] {
  return {
    ...toRaw(data),
    labels: [...(toRaw(data).labels ?? [])],
    datasets: data.datasets.map((dataset) => ({
      ...toRaw(dataset),
      data: [...toRaw(dataset).data],
    })),
  }
}

function render() {
  if (!canvas.value) return
  chart?.destroy()
  chart = new Chart(canvas.value, {
    type: props.type,
    data: toPlainData(props.data),
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
