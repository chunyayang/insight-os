<script setup lang="ts">
/** Light/dark switch. Icon-only, so it carries a localized aria-label (a11y floor). */
const { t } = useI18n()
const { isDark, toggle } = useTheme()
</script>

<template>
  <UButton
    class="rounded-full"
    :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
    :aria-label="t('common.theme.toggle')"
    :title="t('common.theme.toggle')"
    color="neutral"
    variant="ghost"
    square
    @click="toggle"
  />
</template>
