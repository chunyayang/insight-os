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
          <UIcon name="i-lucide-sparkles" class="ai-summary__icon" aria-hidden="true" />
          {{ t('dashboard.aiSummary.title') }}
        </h2>
        <p class="ai-summary__meta">
          {{ t('dashboard.aiSummary.generatedAt', { time: fmt.relativeTime(generatedAt) }) }}
        </p>
      </div>

      <UButton
        :label="t('dashboard.aiSummary.regenerate')"
        icon="i-lucide-refresh-cw"
        size="sm"
        color="neutral"
        variant="outline"
        :loading="regenerating"
        @click="emit('regenerate')"
      />
    </header>

    <p class="ai-summary__text">{{ text }}</p>
  </section>
</template>

<style scoped>
.ai-summary {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
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
  color: var(--ui-text-highlighted);
}

/* Targeted by class, not by element: UIcon renders a <span>, not an <i>. */
.ai-summary__icon {
  color: var(--ui-secondary);
  font-size: 1.125rem;
}

.ai-summary__meta {
  margin-block-start: 0.125rem;
  color: var(--ui-text-dimmed);
  font-size: 0.8125rem;
}

.ai-summary__text {
  color: var(--ui-text-muted);
  line-height: 1.6;
  max-width: 80ch;
}
</style>
