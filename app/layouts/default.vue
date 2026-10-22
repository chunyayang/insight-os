<script setup lang="ts">
/**
 * Authenticated app shell: full-height sidebar beside the top bar and page.
 *
 * The responsive strategy (spec §5.1) lives in ShellSidebar.
 */
const ui = useUiStore()
const router = useRouter()

// Seeds the organization store's settings once per session (spec §4.10) so they are
// readable anywhere in the app, not just on Settings.
useOrgSettingsQuery()

// UDashboardGroup pins the shell to the viewport, so pages scroll inside <main> and Nuxt's
// scrollBehavior, which moves the window, can't reach them. Same rule as Nuxt's: a new
// path starts at the top, a query or hash change on the same path keeps its place.
const main = useTemplateRef('main')
let lastPath = router.currentRoute.value.path
useRuntimeHook('page:finish', () => {
  const { path } = router.currentRoute.value
  if (path === lastPath) return
  lastPath = path
  main.value?.scrollTo({ top: 0 })
})
</script>

<template>
  <UDashboardGroup class="bg-muted">
    <ShellSidebar />

    <!-- The default slot, not #header/#body: it keeps <main> as the scroll container. -->
    <UDashboardPanel>
      <ShellTopbar @toggle-sidebar="ui.toggleSidebar()" @open-mobile-nav="ui.openMobileNav()" />

      <main ref="main" class="flex-1 overflow-y-auto p-4 md:p-6">
        <slot />
      </main>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
