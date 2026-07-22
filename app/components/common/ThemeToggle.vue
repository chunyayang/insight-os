<script setup lang="ts">
/** Light/dark switch. Icon-only, so it carries a localized aria-label (a11y floor). */
const { t } = useI18n()
const { isDark, toggle } = useTheme()
</script>

<template>
  <Button
    :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
    :aria-label="t('common.theme.toggle')"
    :title="t('common.theme.toggle')"
    severity="secondary"
    text
    rounded
    @click="toggle"
  />
</template>
