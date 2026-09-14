<script setup lang="ts">
// UTooltip needs the portal/provider context UApp sets up at the real app root
// (app/app.vue) — mounting the field bare throws, so this stands in for UApp in tests.
</script>

<template>
  <UApp>
    <SettingsPresentationCurrencyField />
  </UApp>
</template>
