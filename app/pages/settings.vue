<script setup lang="ts">
/**
 * General tab only, for now — org name, default operating market, and timezone are
 * later slices. This exists so Settings has a real seam for the presentation currency
 * rather than a placeholder standing in for it.
 */
const { t } = useI18n()
</script>

<template>
  <div>
    <CommonPageHeader :title="t('nav.items.settings')" />
    <SettingsGeneral />
  </div>
</template>
