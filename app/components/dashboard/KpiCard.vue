<script setup lang="ts">
import type { KpiMetric } from '~/types/api'

const props = defineProps<{ metric: KpiMetric }>()

const { t } = useI18n()
const fmt = useFormat()
const organization = useOrganizationStore()

const label = computed(() => t(`dashboard.kpi.${props.metric.key}`))

// Keyed by the metric so a new KPI can't ship without an icon.
const ICON: Record<KpiMetric['key'], string> = {
  revenue: 'i-lucide-circle-dollar-sign',
  orders: 'i-lucide-shopping-cart',
  conversionRate: 'i-lucide-percent',
  activeUsers: 'i-lucide-users',
}

/**
 * A monetary KPI renders in the org's presentation currency. The amount is read straight out
 * of the Money map — the client picks a key, it never converts.
 */
const displayValue = computed(() => {
  const value = props.metric.value
  if (typeof value === 'object') {
    const currency = organization.presentationCurrency
    return fmt.compactCurrency(value[currency], currency)
  }
  if (props.metric.key === 'conversionRate') return fmt.percent(value)
  return fmt.number(value)
})

// Only an amount is abbreviated, so only an amount has a fuller form to offer.
const fullAmount = computed(() => {
  const value = props.metric.value
  return typeof value === 'object' ? fmt.money(value, organization.presentationCurrency) : undefined
})

// The delta shows one decimal of a percent, so anything smaller than this reads "0.0%"
// and must not claim a direction.
const FLAT_BELOW = 0.0005

const trend = computed<'up' | 'down' | 'neutral'>(() => {
  if (Math.abs(props.metric.deltaPct) < FLAT_BELOW) return 'neutral'
  return props.metric.deltaPct > 0 ? 'up' : 'down'
})
</script>

<template>
  <!-- Body only: a header would divide the label from the figure it names. -->
  <UCard
    as="article"
    :ui="{
      root: 'min-w-0',
      body: 'flex flex-col gap-1.5 px-5 py-4.5 sm:px-5 sm:py-4.5',
    }"
  >
    <div class="kpi__top">
      <p class="kpi__label">{{ label }}</p>
      <UIcon :name="ICON[metric.key]" class="kpi__icon" aria-hidden="true" />
    </div>
    <!-- An amount is abbreviated on screen, full on hover and for screen readers. -->
    <p class="kpi__value" :title="fullAmount">
      <template v-if="fullAmount">
        <span class="sr-only">{{ fullAmount }}</span>
        <span aria-hidden="true">{{ displayValue }}</span>
      </template>
      <template v-else>{{ displayValue }}</template>
    </p>

    <!-- The delta and its caption share one tinted pill; the sparkline sits beside it. -->
    <div class="kpi__footer">
      <span class="kpi__delta" :class="`kpi__delta--${trend}`">
        <UIcon
          v-if="trend !== 'neutral'"
          :name="trend === 'down' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
          aria-hidden="true"
        />
        <span class="kpi__delta-value">{{ fmt.delta(metric.deltaPct) }}</span>
        {{ t('dashboard.kpi.vsYesterday') }}
      </span>

      <div class="kpi__spark">
        <ChartsSparkline
          :data="metric.sparkline"
          :trend="trend"
          :summary="t('dashboard.kpi.sparklineSummary', { metric: label })"
        />
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.kpi__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.kpi__label {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

/* Decorative (aria-hidden): the label already names the metric. */
.kpi__icon {
  flex-shrink: 0;
  color: var(--ui-text-dimmed);
  font-size: 1rem;
}

.kpi__value {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ui-text-highlighted);
  font-variant-numeric: tabular-nums;
  /* Long CJK labels and big numbers must wrap rather than overflow the card. */
  overflow-wrap: anywhere;
}

.kpi__footer {
  display: flex;
  /* Centred, not bottom-aligned: the sparkline is taller than the pill, and pinning the pill
     to its foot opened a gap between the figure and its delta. */
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.kpi__delta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  white-space: nowrap;
}

.kpi__delta-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Direction colours are semantic tokens — they carry meaning, not decoration. The tint
   takes the bright fill and the text the ink, like the sidebar's active link. */
.kpi__delta--up {
  color: var(--ink-primary);
  background: color-mix(in oklab, var(--ui-primary) 12%, transparent);
}
.kpi__delta--down {
  color: var(--ink-error);
  background: color-mix(in oklab, var(--ui-error) 12%, transparent);
}
.kpi__delta--neutral {
  color: var(--ink-info);
  background: color-mix(in oklab, var(--ui-info) 12%, transparent);
}

/* Sized here because the chart fills whatever box it is given. It gives way to the pill
   in a narrow card, or under a longer zh-TW caption, rather than wrapping below it. */
.kpi__spark {
  flex: 1 1 0;
  min-width: 3rem;
  max-width: 6rem;
}
</style>
