<script setup lang="ts">
/**
 * Placeholder route. The module lands in a later slice; this exists now so the
 * navigation is walkable end to end and the RBAC route guard is real rather than
 * theoretical.
 *
 * Guarded by `ai:chat`: roles without it are redirected by the global
 * auth middleware, matching the hidden nav entry.
 */
const { t } = useI18n()

definePageMeta({ ability: 'ai:chat' })
</script>

<template>
  <div>
    <CommonPageHeader :title="t('nav.items.aiAssistant')" />
    <UEmpty icon="i-lucide-wrench" :title="t('common.states.comingSoon')" />
  </div>
</template>
