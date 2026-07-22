<script setup lang="ts">
/**
 * Locale switcher. Required in the top bar AND on the login screen, so it lives in
 * components/common/. With strategy 'no_prefix', setLocale swaps language in place
 * without navigation, and i18n persists the choice in a cookie for SSR.
 *
 * Option labels come from each locale's own `name` ("English", "繁體中文") so they read
 * correctly whichever language is active.
 */
const { locale, locales, setLocale, t } = useI18n()

const options = computed(() =>
  locales.value.map((l) =>
    typeof l === 'string' ? { label: l, value: l } : { label: l.name ?? l.code, value: l.code },
  ),
)
</script>

<template>
  <Select
    :model-value="locale"
    :options="options"
    option-label="label"
    option-value="value"
    :aria-label="t('common.language.switch')"
    size="small"
    @update:model-value="(code) => setLocale(code)"
  />
</template>
