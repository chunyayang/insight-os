<script setup lang="ts">
/** Part of the mandatory three-state floor: loading (Skeleton) / EMPTY / error. */
withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
  }>(),
  { icon: 'pi pi-inbox', description: undefined },
)
</script>

<template>
  <div class="empty-state">
    <i :class="icon" class="empty-state__icon" aria-hidden="true" />
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-state__icon {
  font-size: 1.75rem;
  color: var(--ui-text-dimmed);
}

.empty-state__title {
  font-weight: 600;
  color: var(--ui-text-highlighted);
}

.empty-state__description {
  color: var(--ui-text-muted);
  max-width: 34ch;
}

.empty-state__action {
  margin-block-start: 0.5rem;
}
</style>
