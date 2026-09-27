import { use, type ComposeOption } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
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
 *
 * SVGRenderer, not CanvasRenderer: a canvas's backing bitmap scales with devicePixelRatio²,
 * which is real extra GPU memory on the Retina/high-DPI hardware most of the audience uses.
 * SVG's DOM-node cost doesn't scale with pixel density. See echarts-migration.md PR 3 for
 * the measured trade-off (bundle +2%, frame time and JS heap flat).
 */
use([SVGRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

/** Only what's registered above type-checks, so an unregistered series fails at build time. */
export type ChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption
>
