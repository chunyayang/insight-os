<script setup lang="ts">
import type { KpiMetric } from '~/types/api'

const props = defineProps<{ metric: KpiMetric }>()

const { t } = useI18n()
const fmt = useFormat()

const label = computed(() => t(`dashboard.kpi.${props.metric.key}`))

/**
 * Dashboard KPIs are NOT Analytics, so monetary values render in the base currency and
 * do not react to the Analytics currency selector. The value is read straight out of the
 * Money map — the client picks a key, it never converts.
 */
const displayValue = computed(() => {
  const value = props.metric.value
  if (typeof value === 'object') return fmt.nativeMoney(value, 'All')
  if (props.metric.key === 'conversionRate') return fmt.percent(value)
  return fmt.number(value)
})

const trend = computed<'up' | 'down' | 'neutral'>(() => {
  if (props.metric.deltaPct > 0) return 'up'
  if (props.metric.deltaPct < 0) return 'down'
  return 'neutral'
})
</script>

<template>
  <article class="kpi">
    <p class="kpi__label">{{ label }}</p>
    <p class="kpi__value">{{ displayValue }}</p>

    <div class="kpi__footer">
      <span class="kpi__delta" :class="`kpi__delta--${trend}`">
        <i
          :class="trend === 'down' ? 'pi pi-arrow-down-right' : 'pi pi-arrow-up-right'"
          aria-hidden="true"
        />
        {{ fmt.delta(metric.deltaPct) }}
      </span>
      <span class="kpi__delta-caption">{{ t('dashboard.kpi.vsYesterday') }}</span>
    </div>

    <div class="kpi__spark">
      <ChartsSparkline
        :data="metric.sparkline"
        :trend="trend"
        :summary="t('dashboard.kpi.sparklineSummary', { metric: label })"
      />
    </div>
  </article>
</template>

<style scoped>
.kpi {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow);
  padding: 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.kpi__label {
  color: var(--sub);
  font-size: 0.875rem;
}

.kpi__value {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  /* Long CJK labels and big numbers must wrap rather than overflow the card. */
  overflow-wrap: anywhere;
}

.kpi__footer {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  font-size: 0.8125rem;
}

.kpi__delta {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Direction colours are semantic tokens — they carry meaning, not decoration. */
.kpi__delta--up {
  color: var(--prim-ink);
}
.kpi__delta--down {
  color: var(--danger-ink);
}
.kpi__delta--neutral {
  color: var(--sub);
}

.kpi__delta-caption {
  color: var(--faint);
}

.kpi__spark {
  margin-block-start: 0.25rem;
}
</style>
