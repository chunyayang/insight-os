<script setup lang="ts">
/**
 * Docked sidebar on desktop, collapsible to an icon rail; below 1024px USidebar swaps it
 * for an overlay, where `open` drives the overlay instead of the rail.
 */
const ui = useUiStore()
const { t } = useI18n()

// Matches USidebar's own breakpoint. False until mounted, as in USidebar, so the server
// and the first client render agree.
const isMobile = ref(false)
let mobileQuery: MediaQueryList | undefined

// USidebar keeps its overlay's open state across the desktop breakpoint and resyncs it only
// when `open` changes on mobile, which it doesn't when the rail is collapsed. Remounting it
// on the way to desktop starts the next overlay closed.
const sidebarKey = ref(0)

function syncMobile() {
  if (isMobile.value && !mobileQuery!.matches) sidebarKey.value++
  isMobile.value = mobileQuery!.matches
  ui.closeMobileNav()
}

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 1023px)')
  syncMobile()
  mobileQuery.addEventListener('change', syncMobile)
})
onBeforeUnmount(() => mobileQuery?.removeEventListener('change', syncMobile))

// Desktop writes are ignored: USidebar only writes `open` there to sync itself across the
// breakpoint, and that must not overwrite the persisted rail preference. The toggle
// changes the store directly.
const open = computed({
  get: () => (isMobile.value ? ui.mobileNavOpen : !ui.sidebarCollapsed),
  set: (value) => {
    if (isMobile.value) ui.mobileNavOpen = value
  },
})
</script>

<template>
  <USidebar
    :key="sidebarKey"
    v-model:open="open"
    collapsible="icon"
    :title="t('common.appName')"
    :ui="{ container: 'bg-default' }"
  >
    <template #title="{ state }">
      <ShellBrand :collapsed="state === 'collapsed'" />
    </template>

    <template #default="{ state }">
      <ShellNavMenu :collapsed="state === 'collapsed'" @navigate="ui.closeMobileNav()" />
    </template>
  </USidebar>
</template>
