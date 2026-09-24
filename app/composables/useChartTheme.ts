import { color as zrColor } from 'echarts/core'
import type { MarketCode } from '~/types/api'
import { MARKET_COLOR, MARKETS } from '~/constants/markets'

/**
 * Vertical area fill that fades a series colour out towards the x-axis. The stops go
 * through zrender's own alpha math, which is one more reason chart colours stay hex.
 */
export function areaGradient(color: string, topAlpha = 0.3) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: zrColor.modifyAlpha(color, topAlpha) },
      { offset: 1, color: zrColor.modifyAlpha(color, 0) },
    ],
  }
}

/**
 * Chart chrome — the non-series colours ECharts draws (axes, ticks, tooltip surface and
 * text) plus the two trend-direction colours.
 *
 * Hex for the same reason as MARKET_COLOR: zrender's color parser only understands
 * hex/`rgb()`/`hsl()`/the CSS named-color table — no `oklch()`, no `var()` resolution —
 * so it cannot consume what Nuxt UI's `--ui-*` tokens resolve to. These mirror the
 * slate/emerald/red steps Nuxt UI derives from app.config.ts — keep them in step by
 * hand rather than reading them back out of the DOM.
 */
const CHART_CHROME = {
  light: {
    grid: '#e2e8f0', // slate-200, matches --ui-border
    text: '#64748b', // slate-500, matches --ui-text-muted
    surface: '#ffffff', // matches --ui-bg
    positive: '#059669', // emerald-600, matches --ui-primary
    negative: '#dc2626', // red-600, matches --ui-error
  },
  dark: {
    grid: '#1e293b', // slate-800
    text: '#94a3b8', // slate-400
    surface: '#0f172a', // slate-900
    positive: '#34d399', // emerald-400
    negative: '#f87171', // red-400
  },
} as const

/** Series without a market identity cycle these, in canonical market order. */
const SERIES_RAMP = MARKETS

/**
 * Resolves the chart palette for the active theme.
 *
 * Purely derived from `isDark` — no `getComputedStyle`, no DOM access, no lifecycle
 * hooks. That makes it SSR-safe: charts paint the right colours on the first frame
 * instead of flipping after hydration.
 */
export function useChartTheme() {
  const { isDark } = useTheme()

  const scheme = computed(() => (isDark.value ? 'dark' : 'light'))
  const theme = computed(() => CHART_CHROME[scheme.value])

  /** A market's colour is fixed by identity so it stays identical app-wide. */
  function colorForMarket(market: MarketCode): string {
    return MARKET_COLOR[market][scheme.value]
  }

  /** Series without a market identity fall back to ramp order. */
  function colorAt(index: number): string {
    const market = SERIES_RAMP[index % SERIES_RAMP.length]
    return market ? MARKET_COLOR[market][scheme.value] : ''
  }

  return { theme, colorForMarket, colorAt }
}
