<script setup lang="ts">
import type { AnomalyAlert } from '~/types/api'

defineProps<{ alerts: AnomalyAlert[] }>()

const { t } = useI18n()
const fmt = useFormat()

const severityTag: Record<AnomalyAlert['severity'], string> = {
  critical: 'danger',
  warning: 'warn',
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
          <Tag
            :severity="severityTag[alert.severity]"
            :value="t(`dashboard.alerts.severity.${alert.severity}`)"
          />
          <span class="alerts__time">{{ fmt.relativeTime(alert.detectedAt) }}</span>
        </div>

        <p class="alerts__message">{{ alert.message }}</p>

        <NuxtLink :to="askAiLink(alert)">
          <Button
            :label="t('dashboard.alerts.askAi')"
            icon="pi pi-arrow-right"
            icon-pos="right"
            size="small"
            text
          />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.alerts__heading {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  margin-block-end: 0.75rem;
}

.alerts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1rem;
  list-style: none;
}

.alerts__card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
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
  color: var(--faint);
  font-size: 0.8125rem;
}

.alerts__message {
  color: var(--text);
}
</style>
