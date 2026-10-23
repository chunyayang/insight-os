<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { ROLES } from '~/constants/permissions'

const { t } = useI18n()
const auth = useAuthStore()

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
  <!-- The navbar's own toggle opens the slide-over below `lg`; the collapse button is the
       desktop rail toggle. Each hides itself at the other width.
       Sticky because below `lg` the window scrolls, not the panel body; from `lg` the header
       sits outside the scrolling body, so it stays put either way. z-10 lifts it over
       positioned page content (charts, cards) while staying under Nuxt UI's z-50 overlays. -->
  <UDashboardNavbar
    as="header"
    :toggle="{ class: 'rounded-full' }"
    :ui="{ root: 'sticky top-0 z-10 bg-default', left: 'flex-1' }"
  >
    <template #leading>
      <UDashboardSidebarCollapse class="rounded-full" square />
    </template>

    <template #trailing>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('topbar.searchPlaceholder')"
        :aria-label="t('topbar.search')"
        size="sm"
        class="w-full max-w-104 max-sm:hidden"
      />
    </template>

    <template #right>
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
    </template>
  </UDashboardNavbar>
</template>
