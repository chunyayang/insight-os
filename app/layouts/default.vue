<script setup lang="ts">
/**
 * Authenticated app shell: full-height sidebar beside the top bar and page.
 *
 * The responsive strategy (spec §5.1) lives in ShellSidebar.
 */
const ui = useUiStore()

// Seeds the organization store's settings once per session (spec §4.10) so they are
// readable anywhere in the app, not just on Settings.
useOrgSettingsQuery()
</script>

<template>
  <div class="shell">
    <ShellSidebar />

    <div class="shell__column">
      <ShellTopbar @toggle-sidebar="ui.toggleSidebar()" @open-mobile-nav="ui.openMobileNav()" />

      <main class="shell__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  display: flex;
  background: var(--ui-bg-muted);
}

.shell__column {
  flex: 1;
  min-width: 0; /* lets wide tables/charts scroll instead of blowing out the row */
  display: flex;
  flex-direction: column;
}

.shell__main {
  flex: 1;
  padding: 1.5rem;
}

@media (max-width: 767px) {
  .shell__main {
    padding: 1rem;
  }
}
</style>
