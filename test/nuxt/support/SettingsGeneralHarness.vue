<script setup lang="ts">
// UTooltip needs the portal/provider context UApp sets up at the real app root
// (app/app.vue) — mounting the field bare throws, so this stands in for UApp in tests.
// It stands in for the layout too, whose settings queries seed the stores the form reads.
useOrgSettingsQuery()
useUserSettingsQuery()
</script>

<template>
  <UApp>
    <SettingsGeneral />
  </UApp>
</template>
