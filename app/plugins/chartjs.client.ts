import {
  Chart,
  LineController,
  BarController,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

/**
 * Register Chart.js controllers/elements ONCE, client-side.
 *
 * Per the conventions this never happens per-component: repeated registration is
 * wasteful and makes tree-shaking unpredictable. Client-only because Chart.js needs a
 * canvas — charts render after hydration, with a Skeleton shown until then.
 */
export default defineNuxtPlugin(() => {
  Chart.register(
    LineController,
    BarController,
    LineElement,
    PointElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    Filler,
  )

  // Respect prefers-reduced-motion for chart animations (a11y floor).
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    Chart.defaults.animation = false
  }
})
