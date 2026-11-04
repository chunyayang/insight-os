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
  <!-- No visible heading: one over the cards would read as titling the Revenue Trend
       beside them too. The section keeps its name for assistive tech. -->
  <section :aria-label="t('dashboard.alerts.title')">
    <UEmpty
      v-if="alerts.length === 0"
      icon="i-lucide-circle-check"
      :title="t('dashboard.alerts.empty')"
    />

    <ul v-else class="alerts">
      <UCard
        v-for="alert in alerts"
        :key="alert.id"
        as="li"
        :ui="{
          root: alert.severity === 'critical' ? 'min-w-0 ring-error' : 'min-w-0',
          body: 'flex flex-col items-start gap-2 px-4.5 py-4 sm:px-4.5 sm:py-4',
        }"
      >
        <div class="alerts__top">
          <UBadge
            :color="severityColor[alert.severity]"
            variant="soft"
            :label="t(`dashboard.alerts.severity.${alert.severity}`)"
            class="font-semibold uppercase"
          />
          <span class="alerts__time">{{ fmt.relativeTime(alert.detectedAt) }}</span>
        </div>

        <p class="alerts__message">{{ alert.message }}</p>

        <!-- `to` makes the UButton its own NuxtLink — wrapping it would nest a
             <button> inside an <a>. The tint matches the sidebar's active link. -->
        <UButton
          :to="askAiLink(alert)"
          :label="t('dashboard.alerts.askAi')"
          icon="i-lucide-sparkles"
          trailing-icon="i-lucide-arrow-right"
          size="sm"
          variant="soft"
          class="bg-primary/12 font-semibold"
        />
      </UCard>
    </ul>
  </section>
</template>

<style scoped>
.alerts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  gap: 1rem;
  list-style: none;
}

.alerts__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.alerts__time {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}

.alerts__message {
  color: var(--ui-text-highlighted);
}
</style>
