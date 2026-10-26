import type { MarketFilter } from '~/constants/markets'

/**
 * The signed-in user's session defaults — seeded from their own settings
 * (`useUserSettingsQuery`, called once from the authenticated layout), not server data
 * cloned into Pinia: this store holds the seeded value and the setter, never the fetch.
 *
 * Distinct from `organization`, which holds org policy. `defaultMarket` is where one
 * person starts their day (spec §4.10): the fallback a page's market filter takes when
 * its URL has none, and the Dashboard's scope. It is never a filter value itself, and no
 * page's own market selection writes back to it.
 */
export const usePreferencesStore = defineStore('preferences', () => {
  const defaultMarket = ref<MarketFilter>('All')

  function setDefaultMarket(next: MarketFilter) {
    defaultMarket.value = next
  }

  return { defaultMarket, setDefaultMarket }
})
