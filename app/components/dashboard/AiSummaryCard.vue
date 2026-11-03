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
  <!--
    The card stretches to the Revenue Trend's height when they share a row, so the body
    grows and the footer stays at the bottom. Padding matches that card so the two titles line up.
    Only the footer is divided off: the title runs straight into the summary it heads.
  -->
  <UCard
    as="section"
    aria-labelledby="ai-summary-heading"
    :ui="{
      root: 'flex flex-col divide-y-0 rounded-xl shadow-sm',
      header: 'px-5 pt-5 pb-0 sm:px-5',
      body: 'flex-1 p-5 sm:p-5',
      footer:
        'flex flex-wrap items-center justify-between gap-3 border-t border-default px-5 py-3 sm:px-5',
    }"
  >
    <template #header>
      <h2 id="ai-summary-heading" class="ai-summary__title">
        <UIcon name="i-lucide-sparkles" class="ai-summary__icon" aria-hidden="true" />
        {{ t('dashboard.aiSummary.title') }}
      </h2>
    </template>

    <p class="ai-summary__text">{{ text }}</p>

    <template #footer>
      <p class="ai-summary__meta">
        {{ t('dashboard.aiSummary.generatedAt', { time: fmt.relativeTime(generatedAt) }) }}
      </p>

      <UButton
        :label="t('dashboard.aiSummary.regenerate')"
        icon="i-lucide-refresh-cw"
        size="sm"
        color="neutral"
        variant="outline"
        :loading="regenerating"
        @click="emit('regenerate')"
      />
    </template>
  </UCard>
</template>

<style scoped>
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

.ai-summary__text {
  color: var(--ui-text-muted);
  line-height: 1.6;
  max-width: 80ch;
}

.ai-summary__meta {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
