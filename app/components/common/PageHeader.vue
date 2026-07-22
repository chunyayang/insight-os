<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__text">
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap; /* CJK text can run longer — let actions wrap rather than clip */
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-block-end: 1.5rem;
}

.page-header__title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
}

.page-header__subtitle {
  margin-block-start: 0.25rem;
  color: var(--sub);
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
