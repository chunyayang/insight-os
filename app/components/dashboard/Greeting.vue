<script setup lang="ts">
import { dayPeriod } from '~/utils/format'

/**
 * The Dashboard's header: a greeting and today's date in the viewer's own zone, then the
 * read-only market indicator (spec §4.2). The server can't know the viewer's zone, so the
 * header renders after mount; its fallback holds the same height so nothing jumps.
 */
const { t } = useI18n()
const { longDate } = useFormat()
const auth = useAuthStore()
const preferences = usePreferencesStore()

// First word of the name: a CJK name with no space stays whole.
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')

const market = computed(() => t(`common.markets.${preferences.defaultMarket.toLowerCase()}`))
</script>

<template>
  <ClientOnly>
    <CommonPageHeader
      :title="t(`dashboard.greeting.${dayPeriod()}`, { name: firstName })"
      :subtitle="t('dashboard.subtitle', { date: longDate(), market })"
    />
    <template #fallback>
      <div class="greeting__fallback">
        <USkeleton class="h-8 w-64" />
        <USkeleton class="mt-1 h-6 w-80" />
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
/* Mirrors PageHeader's own bottom margin. */
.greeting__fallback {
  margin-block-end: 1.5rem;
}
</style>
