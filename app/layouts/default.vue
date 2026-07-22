<script setup lang="ts">
/**
 * Authenticated app shell: top bar + grouped sidebar.
 *
 * Responsive strategy (spec §5.1): full sidebar on desktop, icon-only rail below
 * 1024px, and a PrimeVue Drawer below 768px. The rail state is persisted UI state
 * (Pinia); the drawer is transient.
 */
const ui = useUiStore()
const { t } = useI18n()
</script>

<template>
  <div class="shell" :class="{ 'shell--collapsed': ui.sidebarCollapsed }">
    <ShellTopbar
      class="shell__topbar"
      @toggle-sidebar="ui.toggleSidebar()"
      @open-mobile-nav="ui.openMobileNav()"
    />

    <aside class="shell__sidebar">
      <ShellSidebar :collapsed="ui.sidebarCollapsed" />
    </aside>

    <!-- Mobile: same nav inside a Drawer. Escape closes it and returns focus (PrimeVue). -->
    <Drawer
      v-model:visible="ui.mobileNavOpen"
      :header="t('common.appName')"
      position="left"
      class="shell__drawer"
    >
      <ShellSidebar @navigate="ui.closeMobileNav()" />
    </Drawer>

    <main class="shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 16rem 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'topbar topbar'
    'sidebar main';
  background: var(--bg);
}

.shell--collapsed {
  grid-template-columns: 4.5rem 1fr;
}

.shell__topbar {
  grid-area: topbar;
}

.shell__sidebar {
  grid-area: sidebar;
  border-inline-end: 1px solid var(--border);
  background: var(--card);
  overflow-y: auto;
}

.shell__main {
  grid-area: main;
  padding: 1.5rem;
  min-width: 0; /* lets wide tables/charts scroll instead of blowing out the grid */
}

/* Tablet: force the icon-only rail regardless of the persisted preference.
   The label hiding is scoped to the docked sidebar so the mobile Drawer — which
   reuses AppSidebar at full width — still shows its labels. Done in CSS rather than
   a JS viewport check to stay SSR-safe (no hydration mismatch, no flash). */
@media (max-width: 1023px) {
  .shell,
  .shell--collapsed {
    grid-template-columns: 4.5rem 1fr;
  }

  .shell__sidebar :deep(.sidebar__label),
  .shell__sidebar :deep(.sidebar__group-label) {
    display: none;
  }

  .shell__sidebar :deep(.sidebar__link) {
    justify-content: center;
  }
}

/* Mobile: sidebar becomes the Drawer. */
@media (max-width: 767px) {
  .shell,
  .shell--collapsed {
    grid-template-columns: 1fr;
    grid-template-areas:
      'topbar'
      'main';
  }

  .shell__sidebar {
    display: none;
  }

  .shell__main {
    padding: 1rem;
  }
}
</style>
