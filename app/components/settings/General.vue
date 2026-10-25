<script setup lang="ts">
import { CURRENCY_CODES, MARKETS, type MarketFilter } from '~/constants/markets'
import type { CurrencyCode } from '~/types/api'

const { t } = useI18n()
const { can, isDisabledWhenDenied } = useCan()
const organization = useOrganizationStore()
const preferences = usePreferencesStore()

// Cache-shared with the layout's session seed — this just adds the loading/pending
// state the form needs, not a second request.
useOrgSettingsQuery()
useUserSettingsQuery()
const update = useUpdatePresentationCurrencyMutation()
const updateMarket = useUpdateDefaultMarketMutation()

// A user preference, gated on nothing: every role sets their own (spec §4.10).
const marketOptions = computed(() =>
  (['All', ...MARKETS] as const).map((code) => ({
    label: t(`common.markets.${code.toLowerCase()}`),
    value: code,
  })),
)

function onMarketChange(next: MarketFilter) {
  if (next === preferences.defaultMarket) return
  updateMarket.mutate({ defaultMarket: next })
}

const isDenied = computed(() => !can('settings:org') && isDisabledWhenDenied('settings:org'))
const isDisabled = computed(() => isDenied.value || update.isPending.value)

const currencyOptions = computed(() => CURRENCY_CODES.map((code) => ({ label: code, value: code })))

function onChange(next: CurrencyCode) {
  if (next === organization.presentationCurrency) return
  update.mutate({ presentationCurrency: next })
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="general__title">{{ t('settings.general.title') }}</h2>
    </template>

    <UFormField
      :label="t('settings.general.defaultMarket.label')"
      :help="t('settings.general.defaultMarket.help')"
      name="defaultMarket"
      class="mb-6"
    >
      <USelect
        :model-value="preferences.defaultMarket"
        :items="marketOptions"
        :disabled="updateMarket.isPending.value"
        class="w-56"
        @update:model-value="onMarketChange"
      />
    </UFormField>

    <UFormField
      :label="t('settings.general.presentationCurrency.label')"
      :help="t('settings.general.presentationCurrency.help')"
      name="presentationCurrency"
    >
      <UTooltip
        :text="t('settings.general.presentationCurrency.deniedTooltip')"
        :disabled="!isDenied"
      >
        <span class="inline-block">
          <USelect
            :model-value="organization.presentationCurrency"
            :items="currencyOptions"
            :disabled="isDisabled"
            class="w-56"
            @update:model-value="onChange"
          />
        </span>
      </UTooltip>
    </UFormField>
  </UCard>
</template>

<style scoped>
.general__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ui-text-highlighted);
}
</style>
