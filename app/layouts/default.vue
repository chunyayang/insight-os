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

// From `lg` UDashboardGroup pins the shell to the viewport and pages scroll inside the
// panel's body, which Nuxt's scrollBehavior (it moves the window) can't reach. Same rule as
// Nuxt's: a new path starts at the top, back/forward returns to where that entry was left, a
// query or hash change on the same path keeps its place. Below `lg` the body doesn't scroll,
// so this is a no-op and Nuxt's own behaviour applies.
const main = useTemplateRef('main')
const body = () => main.value?.closest('[data-slot="body"]')
let lastPath = router.currentRoute.value.path

// Vue Router numbers history entries (`history.state.position`). A navigation that starts on
// an entry other than the one last landed on is a back/forward traversal.
const scrollByEntry = new Map<number | undefined, number>()
let entry: number | undefined
let traversal = false
if (import.meta.client) {
  entry = history.state?.position
  const stopBefore = router.beforeEach(() => {
    scrollByEntry.set(entry, body()?.scrollTop ?? 0)
    traversal = history.state?.position !== entry
  })
  const stopAfter = router.afterEach((_to, _from, failure) => {
    if (!failure) entry = history.state?.position
  })
  onScopeDispose(() => {
    stopBefore()
    stopAfter()
  })
}

useRuntimeHook('page:finish', () => {
  const { path } = router.currentRoute.value
  if (path === lastPath) return
  lastPath = path
  body()?.scrollTo({ top: traversal ? (scrollByEntry.get(entry) ?? 0) : 0 })
})
</script>

<template>
  <UDashboardGroup
    :persistent="false"
    unit="rem"
    class="bg-muted max-lg:static max-lg:overflow-visible"
  >
    <ShellSidebar />

    <!-- The body scrolls only from `lg`, matching the group: below it the window scrolls. -->
    <UDashboardPanel :ui="{ body: 'max-lg:overflow-visible' }">
      <template #header>
        <ShellTopbar />
      </template>

      <template #body>
        <main ref="main">
          <slot />
        </main>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
