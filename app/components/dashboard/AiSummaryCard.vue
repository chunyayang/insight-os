<script setup lang="ts">
defineProps<{
  text: string
  generatedAt: string
  regenerating?: boolean
}>()

const emit = defineEmits<{ regenerate: [] }>()

const { t } = useI18n()
const fmt = useFormat()
</script>

<template>
  <section class="ai-summary" aria-labelledby="ai-summary-heading">
    <header class="ai-summary__header">
      <div>
        <h2 id="ai-summary-heading" class="ai-summary__title">
          <i class="pi pi-sparkles" aria-hidden="true" />
          {{ t('dashboard.aiSummary.title') }}
        </h2>
        <p class="ai-summary__meta">
          {{ t('dashboard.aiSummary.generatedAt', { time: fmt.relativeTime(generatedAt) }) }}
        </p>
      </div>

      <Button
        :label="t('dashboard.aiSummary.regenerate')"
        icon="pi pi-refresh"
        size="small"
        severity="secondary"
        outlined
        :loading="regenerating"
        @click="emit('regenerate')"
      />
    </header>

    <p class="ai-summary__text">{{ text }}</p>
  </section>
</template>

<style scoped>
.ai-summary {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
  padding: 1.25rem;
  min-width: 0;
}

.ai-summary__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-block-end: 0.75rem;
}

.ai-summary__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.ai-summary__title i {
  color: var(--violet);
}

.ai-summary__meta {
  margin-block-start: 0.125rem;
  color: var(--faint);
  font-size: 0.8125rem;
}

.ai-summary__text {
  color: var(--sub);
  line-height: 1.6;
  max-width: 80ch;
}
</style>
