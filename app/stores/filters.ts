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

  /**
   * Seeded by Settings→General *default operating market* once that module exists; `'All'` is
   * the no-setting fallback, not a fixed default. Don't assume it here (see `displayCurrency`).
   */
  const market = ref<MarketFilter>('All')

  /**
   * Analytics-only. This is a PRESENTATION-currency override: it re-presents already-fetched
   * figures for this page and nothing else. Renamed to `presentationCurrency` in issue #43.
   *
   * `'USD'` is the fallback for "no organization setting", not a fixed default: this initializes
   * from the org's REPORTING CURRENCY (Settings→General, spec §4.10) once Settings is built.
   * Seeding only — the org setting is server data and must not be mirrored into Pinia; after the
   * initial value this ref is owned by the user's selection for the session.
   */
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
