import type { RouteLocationRaw } from 'vue-router'
import { MARKET_FILTERS } from '~/constants/markets'
import { acceptsMarketParam } from '~/constants/navigation'
import { readFilterParam, writeFilterParam } from '~/utils/urlFilter'

/**
 * Build a nav target that carries the market scope the user is currently looking at.
 *
 * Per-page filters mean a market picked on Analytics doesn't re-scope other pages —
 * but it should not be *lost* either when the user walks the sidebar to a page that
 * asks the same question. Deep links already carry `?market=` forward (an anomaly
 * card into the AI Assistant); this does the same for ordinary navigation, so the
 * market is still the subject of the investigation without any shared mutable state.
 *
 * Two ways it declines to carry the param, both load-bearing:
 *   - The destination has no market control of its own (`acceptsMarketParam`), so a
 *     param there would be a filter nothing on the page explains.
 *   - The value equals the session default, which is elided from the URL entirely.
 *
 * The current market is read from the route only on a page entitled to the param;
 * elsewhere the session default stands in, so a hand-typed `/settings?market=JP`
 * cannot smuggle a scope into the links around it.
 */
export function useMarketLink() {
  const route = useRoute()
  const filters = useFiltersStore()

  const current = computed(() =>
    acceptsMarketParam(route.path)
      ? readFilterParam(route.query.market, MARKET_FILTERS, filters.defaultMarket)
      : filters.defaultMarket,
  )

  return (to: string): RouteLocationRaw => {
    if (!acceptsMarketParam(to)) return to
    const query = writeFilterParam({}, 'market', current.value, filters.defaultMarket)
    // A bare string keeps NuxtLink's href clean when there is nothing to carry.
    return 'market' in query ? { path: to, query } : to
  }
}
