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

const items = computed(() =>
  locales.value.map((l) =>
    typeof l === 'string' ? { label: l, value: l } : { label: l.name ?? l.code, value: l.code },
  ),
)
</script>

<template>
  <USelect
    :model-value="locale"
    :items="items"
    :aria-label="t('common.language.switch')"
    size="sm"
    @update:model-value="(code) => setLocale(code)"
  />
</template>
