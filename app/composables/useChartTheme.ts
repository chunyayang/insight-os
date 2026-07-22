import type { MarketCode } from '~/types/api'
import { MARKET_CHART_INDEX } from '~/constants/markets'

const RAMP_SIZE = 14

/**
 * Fade a resolved token to an alpha fill. Canvas colour parsing is narrower than CSS —
 * color-mix() isn't reliably supported for fillStyle — so convert to rgba() explicitly.
 * The --chart-* ramp is plain 6-digit hex in both themes, and non-hex input passes through.
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
 * Resolves the design-token chart palette into concrete colors for Chart.js.
 *
 * Chart.js needs real color strings on a canvas — it can't consume `var(--chart-0)` —
 * so the tokens are read from computed style at render time. Because tokens.css
 * re-declares the whole ramp under `.dark`, re-reading after a theme flip is all that's
 * needed for charts to restyle; we never hardcode a second dark palette.
 *
 * The read is deferred to nextTick after the theme changes, because the `.dark` class
 * lands on <html> via useHead on the next tick — reading sooner returns stale values.
 */
export function useChartTheme() {
  const { isDark } = useTheme()

  function readToken(name: string): string {
    if (!import.meta.client) return ''
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  }

  function snapshot() {
    return {
      ramp: Array.from({ length: RAMP_SIZE }, (_, i) => readToken(`--chart-${i}`)),
      grid: readToken('--border'),
      text: readToken('--sub'),
      surface: readToken('--card'),
      // Semantic colours, resolved for canvas use. Trend direction carries meaning, so
      // it uses these rather than the categorical ramp.
      positive: readToken('--prim'),
      negative: readToken('--danger'),
    }
  }

  const theme = ref(snapshot())

  onMounted(() => {
    theme.value = snapshot()
  })

  watch(isDark, async () => {
    await nextTick()
    theme.value = snapshot()
  })

  /** A market's colour is fixed by its ramp index so it stays identical app-wide. */
  function colorForMarket(market: MarketCode): string {
    return theme.value.ramp[MARKET_CHART_INDEX[market]] ?? theme.value.ramp[0] ?? ''
  }

  /** Series without a market identity fall back to ramp order. */
  function colorAt(index: number): string {
    return theme.value.ramp[index % RAMP_SIZE] ?? ''
  }

  return { theme, colorForMarket, colorAt }
}
