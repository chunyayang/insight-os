<script setup lang="ts">
import { CURRENCY_CODES } from '~/constants/markets'
import type { CurrencyCode } from '~/types/api'

const { t } = useI18n()
const { can, isDisabledWhenDenied } = useCan()
const organization = useOrganizationStore()

// Cache-shared with the layout's session seed — this just adds the loading/pending
// state the form needs, not a second request.
useOrgSettingsQuery()
const update = useUpdatePresentationCurrencyMutation()

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
      <h2 class="presentation-currency__title">{{ t('settings.general.title') }}</h2>
    </template>

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
.presentation-currency__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--ui-text-highlighted);
}
</style>
