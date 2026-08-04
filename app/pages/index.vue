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

    <!-- Loading: skeletons matching the real layout, not a spinner. USkeleton takes no
         size props — its box is set with utilities, and the heights mirror the cards
         they stand in for so the page doesn't jump when the data lands. -->
    <template v-if="isPending">
      <div class="dash__kpis">
        <USkeleton v-for="n in 4" :key="n" class="h-36 rounded-xl" />
      </div>
      <USkeleton class="dash__block h-40 rounded-xl" />
      <USkeleton class="dash__block h-88 rounded-xl" />
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
