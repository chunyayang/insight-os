<script setup lang="ts">
/** General tab only, for now — the organization name and the other tabs are later slices. */
const { t } = useI18n()
</script>

<template>
  <div>
    <CommonPageHeader :title="t('nav.items.settings')" />
    <SettingsGeneral />
  </div>
</template>
