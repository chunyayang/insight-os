<script setup lang="ts">
/**
 * Authenticated app shell: full-height sidebar beside the top bar and page.
 *
 * The responsive strategy (spec §5.1) lives in ShellSidebar. The group is not persistent:
 * the rail preference is the ui store's cookie, bound through ShellSidebar's
 * v-model:collapsed, not a second cookie of the group's own. Below `lg` the group is
 * released so the window scrolls: phones keep scroll restoration on back/forward and an
 * address bar that shrinks on scroll.
 */
const router = useRouter()

// Seeds the organization store's settings once per session (spec §4.10) so they are
// readable anywhere in the app, not just on Settings.
useOrgSettingsQuery()

// From `lg` UDashboardGroup pins the shell to the viewport and pages scroll inside <main>,
// which Nuxt's scrollBehavior (it moves the window) can't reach. Same rule as Nuxt's: a new
// path starts at the top, a query or hash change on the same path keeps its place. Below
// `lg` <main> doesn't scroll, so this is a no-op and Nuxt's own behaviour applies.
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
  <UDashboardGroup
    :persistent="false"
    unit="rem"
    class="bg-muted max-lg:static max-lg:overflow-visible"
  >
    <ShellSidebar />

    <!-- The default slot, not #header/#body: it keeps <main> as the scroll container. -->
    <UDashboardPanel>
      <ShellTopbar />

      <main ref="main" class="flex-1 p-4 md:p-6 lg:overflow-y-auto">
        <slot />
      </main>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
