import type { CurrencyCode, RangeToken } from '~/types/api'
import type { MarketFilter } from '~/constants/markets'

/**
 * Session-level filter defaults. These are UI state (Pinia); they SEED page filters and
 * flow into Vue Query composables as reactive refs — the data itself never lives here.
 *
 * Note what is and isn't in this store:
 *   - `defaultMarket` is a session default, not the live filter. The live market is
 *     per-page and lives in the URL (`useMarketFilter`), so changing it on one page
 *     cannot silently re-scope another. Settings → General seeds this at session start
 *     (spec §4.10). See `.claude/doc/url-backed-filters.md`.
 *   - `range` is still a DATA-SCOPE filter → part of the query key → server refetch.
 *     It is next in line to move into the URL alongside market.
 *   - `displayCurrency` is deliberately NOT a global filter. It is an Analytics-scoped
 *     display projection over already-fetched data: monetary payloads carry all four
 *     currencies, so switching is an instant client-side key switch with no request.
 *     Keeping it scoped is what stops a control that isn't visible on a page from
 *     silently changing that page's numbers.
 */
export const useFiltersStore = defineStore('filters', () => {
  const range = ref<RangeToken>('30d')

  /**
   * The market a page falls back to when its URL carries no `market` param. Pages read
   * this through `useMarketFilter`; do not read it directly as "the current market".
   */
  const defaultMarket = ref<MarketFilter>('All')

  /** Analytics-only. Do not read this outside Analytics — other pages show native currency. */
  const displayCurrency = ref<CurrencyCode>('USD')

  function setRange(next: RangeToken) {
    range.value = next
  }

  function setDefaultMarket(next: MarketFilter) {
    defaultMarket.value = next
  }

  function setDisplayCurrency(next: CurrencyCode) {
    displayCurrency.value = next
  }

  return {
    range,
    defaultMarket,
    displayCurrency,
    setRange,
    setDefaultMarket,
    setDisplayCurrency,
  }
})
