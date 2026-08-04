<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'
import type { AnomalyAlert } from '~/types/api'

defineProps<{ alerts: AnomalyAlert[] }>()

const { t } = useI18n()
const fmt = useFormat()

/** Severity → semantic badge colour. The label beside it carries the meaning; the
 *  colour only reinforces it, so this never has to stand on its own. */
const severityColor: Record<AnomalyAlert['severity'], BadgeProps['color']> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
}

/**
 * Deep-links into the AI Assistant with the diagnostic question pre-loaded, so the
 * anomaly hands straight off to the explanation rather than making the user re-ask.
 */
function askAiLink(alert: AnomalyAlert) {
  return {
    path: '/ai-assistant',
    query: { q: alert.message, market: alert.market, alert: alert.id },
  }
}
</script>

<template>
  <section aria-labelledby="alerts-heading">
    <h2 id="alerts-heading" class="alerts__heading">{{ t('dashboard.alerts.title') }}</h2>

    <CommonEmptyState
      v-if="alerts.length === 0"
      icon="pi pi-check-circle"
      :title="t('dashboard.alerts.empty')"
    />

    <ul v-else class="alerts">
      <li v-for="alert in alerts" :key="alert.id" class="alerts__card">
        <div class="alerts__top">
          <UBadge
            :color="severityColor[alert.severity]"
            variant="subtle"
            :label="t(`dashboard.alerts.severity.${alert.severity}`)"
          />
          <span class="alerts__time">{{ fmt.relativeTime(alert.detectedAt) }}</span>
        </div>

        <p class="alerts__message">{{ alert.message }}</p>

        <!-- `to` renders the UButton as a NuxtLink itself — the wrapper the PrimeVue
             version needed would have nested a <button> inside an <a>. -->
        <UButton
          :to="askAiLink(alert)"
          :label="t('dashboard.alerts.askAi')"
          trailing-icon="i-lucide-arrow-right"
          size="sm"
          variant="ghost"
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.alerts__heading {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ui-text-highlighted);
  margin-block-end: 0.75rem;
}

.alerts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1rem;
  list-style: none;
}

.alerts__card {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  padding: 1rem 1.125rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  min-width: 0;
}

.alerts__top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.alerts__time {
  color: var(--ui-text-dimmed);
  font-size: 0.8125rem;
}

.alerts__message {
  color: var(--ui-text-highlighted);
}
</style>
