import type { MarketCode } from '~/types/api'
import { MARKET_COLOR, MARKETS } from '~/constants/markets'

/**
 * Fade a resolved token to an alpha fill. Canvas colour parsing is narrower than CSS —
 * color-mix() isn't reliably supported for fillStyle — so convert to rgba() explicitly.
 * Every colour we hand Chart.js is 6-digit hex for exactly this reason; non-hex input
 * passes through unchanged, which would read as a fully opaque fill.
 */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim().replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return color
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Chart chrome — the non-series colours Chart.js draws (axes, ticks, tooltip surface)
 * plus the two trend-direction colours.
 *
 * Hex for the same reason as MARKET_COLOR: Chart.js cannot consume `oklch()`, which is
 * what Nuxt UI's `--ui-*` tokens resolve to. These mirror the slate/emerald/red steps
 * Nuxt UI derives from app.config.ts — keep them in step by hand rather than reading
 * them back out of the DOM.
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
 * instead of flipping after hydration, which the previous CSS-custom-property version
 * needed a `nextTick` workaround to approximate.
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
