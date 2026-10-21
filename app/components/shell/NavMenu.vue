<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { NAV_GROUPS } from '~/constants/navigation'

/**
 * Grouped navigation, filtered by RBAC.
 *
 * An entry whose ability the current role lacks is OMITTED — not disabled — matching
 * spec §3, where *(Hidden)* means the nav entry, route, and controls all disappear.
 * Groups that end up empty are dropped too, so no orphan headings remain.
 */
defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()

const { t } = useI18n()
const { can } = useCan()

// Each inner array is one group; its leading `label` item is the group heading, which
// UNavigationMenu hides on its own when collapsed.
const items = computed<NavigationMenuItem[][]>(() =>
  NAV_GROUPS.map((group) => ({
    key: group.key,
    visible: group.items.filter((item) => !item.ability || can(item.ability)),
  }))
    .filter(({ visible }) => visible.length > 0)
    .map(({ key, visible }) => [
      { label: t(`nav.groups.${key}`), type: 'label' as const },
      ...visible.map((item) => ({
        label: t(`nav.items.${item.key}`),
        icon: item.icon,
        to: item.to,
        onSelect: () => emit('navigate'),
      })),
    ]),
)
</script>

<template>
  <!-- Active link: a tint of the brand colour with ink text, not a solid fill, so it
       reads in both themes (see stack-conventions → design tokens). -->
  <UNavigationMenu
    :items="items"
    :collapsed="collapsed"
    orientation="vertical"
    tooltip
    :ui="{
      root: 'gap-5',
      separator: 'hidden',
      label: 'px-2.5 pt-0 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted',
      link: 'py-2 gap-3 data-active:font-semibold data-active:before:bg-primary/12',
    }"
  />
</template>
