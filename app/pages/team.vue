<script setup lang="ts">
/**
 * Placeholder route. The module lands in a later slice; this exists now so the
 * navigation is walkable end to end and the RBAC route guard is real rather than
 * theoretical.
 *
 * Guarded by `team:manage`: roles without it are redirected by the global
 * auth middleware, matching the hidden nav entry.
 */
const { t } = useI18n()

definePageMeta({ ability: 'team:manage' })
</script>

<template>
  <div>
    <CommonPageHeader :title="t('nav.items.team')" />
    <CommonEmptyState icon="pi pi-wrench" :title="t('common.states.comingSoon')" />
  </div>
</template>
