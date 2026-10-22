<script setup lang="ts">
defineProps<{ collapsed?: boolean }>()

const { t } = useI18n()
</script>

<template>
  <NuxtLink to="/" class="brand" :aria-label="collapsed ? t('common.appName') : undefined">
    <span class="brand__mark">
      <UIcon name="i-lucide-sparkles" class="size-5" />
    </span>
    <span v-if="!collapsed" class="brand__name">{{ t('common.appName') }}</span>
  </NuxtLink>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  border-radius: var(--radius-lg);
  color: var(--ui-text-highlighted);
  text-decoration: none;
}

.brand__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-lg);
  background: var(--ui-primary);
  color: var(--ui-bg);
}

.brand__name {
  font-weight: 700;
  white-space: nowrap;
}
</style>
