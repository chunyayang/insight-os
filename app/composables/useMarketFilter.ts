import type { WritableComputedRef } from 'vue'
import { MARKET_FILTERS, type MarketFilter } from '~/constants/markets'

/**
 * The market a page is scoped to — per page, from the URL (`?market=JP`).
 *
 * Each page owns its own market scope: changing it on Customers does not re-scope
 * Analytics behind the user's back. Continuity across a drill-down comes from links
 * carrying the param forward, not from shared mutable state (spec §4.4's "no second
 * source of truth for market" holds — the URL is the one source).
 *
 * Absent a param, a page falls back to the session's default operating market
 * (Settings → General, spec §4.10), which is the only market value still in Pinia.
 */
export function useMarketFilter(): WritableComputedRef<MarketFilter> {
  const filters = useFiltersStore()
  return useUrlFilter<MarketFilter>('market', MARKET_FILTERS, () => filters.defaultMarket)
}
