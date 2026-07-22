import type { CurrencyCode, RangeToken } from '~/types/api'
import type { MarketFilter } from '~/constants/markets'

/**
 * Global filters. These are UI state (Pinia); they flow INTO Vue Query composables as
 * reactive refs, so changing one refetches — the data itself never lives here.
 *
 * Note what is and isn't in this store:
 *   - `range` / `market` are DATA-SCOPE filters → part of the query key → server refetch.
 *   - `displayCurrency` is deliberately NOT a global filter. It is an Analytics-scoped
 *     display projection over already-fetched data: monetary payloads carry all four
 *     currencies, so switching is an instant client-side key switch with no request.
 *     Keeping it scoped is what stops a control that isn't visible on a page from
 *     silently changing that page's numbers.
 */
export const useFiltersStore = defineStore('filters', () => {
  const range = ref<RangeToken>('30d')
  const market = ref<MarketFilter>('All')

  /** Analytics-only. Do not read this outside Analytics — other pages show native currency. */
  const displayCurrency = ref<CurrencyCode>('USD')

  function setRange(next: RangeToken) {
    range.value = next
  }

  function setMarket(next: MarketFilter) {
    market.value = next
  }

  function setDisplayCurrency(next: CurrencyCode) {
    displayCurrency.value = next
  }

  return { range, market, displayCurrency, setRange, setMarket, setDisplayCurrency }
})
