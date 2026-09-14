import type { CurrencyCode } from '~/types/api'

/**
 * Organization-level configuration — one value, read by everyone, that only
 * Settings → General can write. Session-scoped UI state seeded from an org setting
 * (`useOrgSettingsQuery`, called once from the authenticated layout), not server data
 * cloned into Pinia: this store holds the seeded value and the setter, never the fetch.
 *
 * Distinct from `filters.displayCurrency`: that is an Analytics-only override the user
 * owns for one page. `presentationCurrency` is the IAS 21 presentation currency every
 * cross-market aggregate and dual-currency cell reads when it has no currency control
 * of its own (currency-model.md §3) — changing it changes those pages' headline figure.
 */
export const useOrganizationStore = defineStore('organization', () => {
  const presentationCurrency = ref<CurrencyCode>('USD')

  function setPresentationCurrency(next: CurrencyCode) {
    presentationCurrency.value = next
  }

  return { presentationCurrency, setPresentationCurrency }
})
