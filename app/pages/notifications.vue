<script setup lang="ts">
/**
 * Placeholder route. The module lands in a later slice; this exists now so the
 * navigation is walkable end to end and the RBAC route guard is real rather than
 * theoretical.
 */
const { t } = useI18n()
</script>

<template>
  <div>
    <CommonPageHeader :title="t('nav.items.notifications')" />
    <UEmpty icon="i-lucide-wrench" :title="t('common.states.comingSoon')" />
  </div>
</template>
