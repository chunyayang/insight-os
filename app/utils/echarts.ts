import { use, type ComposeOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, type LineSeriesOption } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  type GridComponentOption,
  type LegendComponentOption,
  type TooltipComponentOption,
} from 'echarts/components'

/**
 * The one ECharts registration point, tree-shaken to what the charts use. Each later
 * chart type (funnel, heatmap, gauge, markPoint annotations) extends this `use()` call
 * and the `ChartOption` union below together, never a second registration site.
 *
 * A side-effect module imported by BaseChart rather than a Nuxt plugin, so ECharts ships
 * in the chunks of routes that render a chart instead of the app entry every route pays
 * for. Registration is DOM-free and safe to run during SSR.
 */
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

/** Only what's registered above type-checks, so an unregistered series fails at build time. */
export type ChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption
>
