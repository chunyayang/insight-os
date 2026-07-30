<script setup lang="ts">
import type { Role } from '~/types/api'
import { ROLES } from '~/constants/permissions'

const emit = defineEmits<{ toggleSidebar: []; openMobileNav: [] }>()

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()

const search = ref('')

/** Placeholder count until the notifications endpoint lands (§4.9). */
const unreadCount = computed(() => 3)

const userMenu = ref()
const menuItems = computed(() => [
  {
    label: `${t('topbar.signedInAs')} ${auth.user?.name ?? ''}`,
    disabled: true,
  },
  { separator: true },
  {
    label: t('topbar.switchRole'),
    icon: 'pi pi-users',
    items: ROLES.map((role) => ({
      label: t(`login.roles.${role}`),
      icon: auth.role === role ? 'pi pi-check' : undefined,
      command: () => auth.switchRole(role as Role),
    })),
  },
  { separator: true },
  {
    label: t('common.actions.signOut'),
    icon: 'pi pi-sign-out',
    command: async () => {
      auth.signOut()
      await navigateTo('/login')
    },
  },
])

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <header class="topbar">
    <!-- Rail toggle on desktop, drawer opener on mobile. Both icon-only -> aria-label. -->
    <Button
      class="topbar__rail-toggle"
      icon="pi pi-bars"
      :aria-label="ui.sidebarCollapsed ? t('nav.expand') : t('nav.collapse')"
      severity="secondary"
      text
      rounded
      @click="emit('toggleSidebar')"
    />
    <Button
      class="topbar__drawer-toggle"
      icon="pi pi-bars"
      :aria-label="t('nav.openMenu')"
      severity="secondary"
      text
      rounded
      @click="emit('openMobileNav')"
    />

    <div class="topbar__search">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="search"
          :placeholder="t('topbar.searchPlaceholder')"
          :aria-label="t('topbar.search')"
          size="small"
          fluid
        />
      </IconField>
    </div>

    <div class="topbar__actions">
      <NuxtLink to="/notifications" class="topbar__bell">
        <OverlayBadge :value="unreadCount" severity="danger">
          <Button
            icon="pi pi-bell"
            :aria-label="t('topbar.unreadCount', { count: unreadCount })"
            severity="secondary"
            text
            rounded
          />
        </OverlayBadge>
      </NuxtLink>

      <CommonThemeToggle />
      <CommonLanguageSwitcher />

      <Button
        class="topbar__avatar"
        :aria-label="t('topbar.userMenu')"
        aria-haspopup="true"
        severity="secondary"
        text
        rounded
        @click="userMenu?.toggle($event)"
      >
        <Avatar :label="initials" shape="circle" size="normal" />
      </Button>
      <Menu ref="userMenu" :model="menuItems" :popup="true" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: var(--ui-bg);
  border-block-end: 1px solid var(--ui-border);
}

.topbar__search {
  flex: 1;
  max-width: 26rem;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-inline-start: auto;
}

.topbar__bell {
  display: inline-flex;
  text-decoration: none;
}

.topbar__drawer-toggle {
  display: none;
}

/* Below the tablet breakpoint the rail toggle gives way to the drawer opener. */
@media (max-width: 1023px) {
  .topbar__rail-toggle {
    display: none;
  }
  .topbar__drawer-toggle {
    display: inline-flex;
  }
}

@media (max-width: 640px) {
  .topbar__search {
    display: none;
  }
}
</style>
