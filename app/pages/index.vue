<script setup lang="ts">
/**
 * Dashboard — a THIN page: it composes feature components and a query composable.
 * No business logic lives here (derivation belongs in the API/mocks, formatting in
 * useFormat, permissions in useCan).
 */
const { t } = useI18n()
const { data, isPending, isError, error, refetch, isFetching } = useDashboardSummary()
</script>

<template>
  <div>
    <CommonPageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')" />

    <!-- Loading: skeletons matching the real layout, not a spinner. -->
    <template v-if="isPending">
      <div class="dash__kpis">
        <Skeleton v-for="n in 4" :key="n" height="9rem" border-radius="var(--radius-card)" />
      </div>
      <Skeleton height="10rem" border-radius="var(--radius-card)" class="dash__block" />
      <Skeleton height="22rem" border-radius="var(--radius-card)" class="dash__block" />
    </template>

    <CommonErrorState v-else-if="isError" :error="error" @retry="refetch()" />

    <template v-else-if="data">
      <div class="dash__kpis">
        <DashboardKpiCard v-for="kpi in data.kpis" :key="kpi.key" :metric="kpi" />
      </div>

      <div class="dash__block">
        <DashboardAnomalyAlerts :alerts="data.alerts" />
      </div>

      <div class="dash__block">
        <DashboardAiSummaryCard
          :text="data.aiSummary.text"
          :generated-at="data.aiSummary.generatedAt"
          :regenerating="isFetching"
          @regenerate="refetch()"
        />
      </div>

      <div class="dash__block">
        <DashboardRevenueTrend />
      </div>
    </template>
  </div>
</template>

<style scoped>
.dash__kpis {
  display: grid;
  /* auto-fit keeps the row honest at every width without hardcoded breakpoints. */
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
}

.dash__block {
  margin-block-start: 1.5rem;
}
</style>
