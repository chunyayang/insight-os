<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { ROLES } from '~/constants/permissions'

const emit = defineEmits<{ toggleSidebar: []; openMobileNav: [] }>()

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()

const search = ref('')

/** Placeholder count until the notifications endpoint lands (§4.9). */
const unreadCount = computed(() => 3)

/**
 * Nested arrays are UDropdownMenu's grouping primitive: each inner array renders as its
 * own `role="group"`, divided by a rule. There is no separator *item* to insert.
 */
const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: `${t('topbar.signedInAs')} ${auth.user?.name ?? ''}`,
      type: 'label',
    },
  ],
  [
    {
      label: t('topbar.switchRole'),
      icon: 'i-lucide-users',
      children: ROLES.map((role) => ({
        label: t(`login.roles.${role}`),
        // `checkbox` rather than a decorative tick: it renders as menuitemcheckbox with
        // aria-checked, so the active role is announced instead of only being drawn.
        type: 'checkbox' as const,
        checked: auth.role === role,
        // Selecting the already-active role fires this with `false`. "No role" isn't a
        // state the app has, so only act on the checked edge and let the re-click be inert.
        onUpdateChecked: (checked: boolean) => {
          if (checked) auth.switchRole(role)
        },
      })),
    },
  ],
  [
    {
      label: t('common.actions.signOut'),
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        auth.signOut()
        await navigateTo('/login')
      },
    },
  ],
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
    <UButton
      class="topbar__rail-toggle rounded-full"
      icon="i-lucide-menu"
      :aria-label="ui.sidebarCollapsed ? t('nav.expand') : t('nav.collapse')"
      color="neutral"
      variant="ghost"
      square
      @click="emit('toggleSidebar')"
    />
    <UButton
      class="topbar__drawer-toggle rounded-full"
      icon="i-lucide-menu"
      :aria-label="t('nav.openMenu')"
      color="neutral"
      variant="ghost"
      square
      @click="emit('openMobileNav')"
    />

    <div class="topbar__search">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('topbar.searchPlaceholder')"
        :aria-label="t('topbar.search')"
        size="sm"
        class="w-full"
      />
    </div>

    <div class="topbar__actions">
      <!-- One link, not a button nested inside one: UButton renders the anchor itself
           when `to` is set, and UChip decorates it without adding another tab stop. -->
      <UChip :text="unreadCount" :show="unreadCount > 0" color="error" size="lg" inset>
        <UButton
          to="/notifications"
          class="rounded-full"
          icon="i-lucide-bell"
          :aria-label="t('topbar.unreadCount', { count: unreadCount })"
          color="neutral"
          variant="ghost"
          square
        />
      </UChip>

      <CommonThemeToggle />
      <CommonLanguageSwitcher />

      <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
        <UButton
          class="rounded-full"
          :avatar="{ text: initials }"
          :aria-label="t('topbar.userMenu')"
          color="neutral"
          variant="ghost"
          square
        />
      </UDropdownMenu>
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
