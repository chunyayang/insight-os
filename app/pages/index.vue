<script setup lang="ts">
/**
 * Dashboard — a THIN page: it composes feature components and a query composable.
 * No business logic lives here (derivation belongs in the API/mocks, formatting in
 * useFormat, permissions in useCan).
 */
const { data, isPending, isError, error, refetch, isFetching } = useDashboardSummary()
</script>

<template>
  <div>
    <DashboardGreeting />

    <!-- Loading: skeletons matching the real layout, not a spinner. USkeleton takes no
         size props — its box is set with utilities, and the heights mirror the cards
         they stand in for so the page doesn't jump when the data lands. -->
    <template v-if="isPending">
      <div class="dash__kpis">
        <USkeleton v-for="n in 4" :key="n" class="h-36 rounded-xl" />
      </div>
      <USkeleton class="dash__block h-40 rounded-xl" />
    </template>

    <CommonErrorState v-else-if="isError" :error="error" @retry="refetch()" />

    <template v-else-if="data">
      <div class="dash__kpis">
        <DashboardKpiCard v-for="kpi in data.kpis" :key="kpi.key" :metric="kpi" />
      </div>

      <div class="dash__block">
        <DashboardAnomalyAlerts :alerts="data.alerts" />
      </div>
    </template>

    <!-- The trend and the summary share a row, but each keeps its own loading state: the
         trend fetches beside the summary, not after it. -->
    <div class="dash__block dash__row">
      <DashboardRevenueTrend class="dash__trend" />

      <!-- No height: it stretches to the row the trend sets. -->
      <USkeleton v-if="isPending" class="dash__summary rounded-xl" />
      <DashboardAiSummaryCard
        v-else-if="data"
        class="dash__summary"
        :text="data.aiSummary.text"
        :generated-at="data.aiSummary.generatedAt"
        :regenerating="isFetching"
        @regenerate="refetch()"
      />
    </div>
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

/* Flex bases in a 2:1 ratio split the row two thirds to one third, and wrap to a stack
   once both no longer fit, without a hardcoded breakpoint. Items stretch to the row's height. */
.dash__row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.dash__trend {
  flex: 2 1 36rem;
  min-width: 0;
}

.dash__summary {
  flex: 1 1 18rem;
  min-width: 0;
}
</style>
