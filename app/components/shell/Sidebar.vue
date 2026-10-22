<script setup lang="ts">
/**
 * Docked sidebar on desktop, collapsible to an icon rail; below `lg` UDashboardSidebar
 * swaps it for a slide-over. The rail (`collapsed`) and the overlay (`open`) are separate
 * models, so the overlay never touches the persisted rail preference.
 */
const ui = useUiStore()
const { t } = useI18n()

// `lg:hidden` only hides an overlay left open across the breakpoint: it stays a modal,
// keeping the desktop shell inert and aria-hidden. Close it on every crossing instead.
let lgQuery: MediaQueryList | undefined
onMounted(() => {
  lgQuery = window.matchMedia('(min-width: 64rem)')
  lgQuery.addEventListener('change', ui.closeMobileNav)
})
onBeforeUnmount(() => lgQuery?.removeEventListener('change', ui.closeMobileNav))
</script>

<template>
  <UDashboardSidebar
    v-model:collapsed="ui.sidebarCollapsed"
    v-model:open="ui.mobileNavOpen"
    collapsible
    :default-size="16"
    :collapsed-size="4"
    :menu="{ title: t('common.appName') }"
    :ui="{ root: 'bg-default' }"
  >
    <template #header="{ collapsed }">
      <ShellBrand :collapsed="collapsed" />
    </template>

    <template #default="{ collapsed }">
      <ShellNavMenu :collapsed="collapsed" @navigate="ui.closeMobileNav()" />
    </template>
  </UDashboardSidebar>
</template>
