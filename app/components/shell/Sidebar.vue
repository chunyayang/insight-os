<script setup lang="ts">
import { NAV_GROUPS } from '~/constants/navigation'

/**
 * Grouped navigation, filtered by RBAC.
 *
 * An entry whose ability the current role lacks is OMITTED — not disabled — matching
 * spec §3, where *(Hidden)* means the nav entry, route, and controls all disappear.
 * Groups that end up empty are dropped too, so no orphan headings remain.
 */
const props = defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()

const { t } = useI18n()
const { can } = useCan()

const visibleGroups = computed(() =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.ability || can(item.ability)),
  })).filter((group) => group.items.length > 0),
)
</script>

<template>
  <nav class="sidebar" :class="{ 'sidebar--collapsed': props.collapsed }">
    <div v-for="group in visibleGroups" :key="group.key" class="sidebar__group">
      <p v-if="!props.collapsed" class="sidebar__group-label">
        {{ t(`nav.groups.${group.key}`) }}
      </p>
      <ul class="sidebar__list">
        <li v-for="item in group.items" :key="item.key">
          <NuxtLink
            :to="item.to"
            class="sidebar__link"
            active-class="sidebar__link--active"
            :aria-label="props.collapsed ? t(`nav.items.${item.key}`) : undefined"
            :title="props.collapsed ? t(`nav.items.${item.key}`) : undefined"
            @click="emit('navigate')"
          >
            <UIcon :name="item.icon" class="sidebar__icon" />
            <span v-if="!props.collapsed" class="sidebar__label">
              {{ t(`nav.items.${item.key}`) }}
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0.75rem;
}

.sidebar__group-label {
  padding-inline: 0.625rem;
  margin-block-end: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ui-text-dimmed);
}

.sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  list-style: none;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-lg);
  color: var(--ui-text-muted);
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

/* Explicit box so the rail width stays stable regardless of the icon's own intrinsic
   size, and so labels can't squeeze it when zh-TW copy runs long. */
.sidebar__icon {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
}

.sidebar--collapsed .sidebar__link {
  justify-content: center;
}

.sidebar__link:hover {
  background: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
}

/* Tinted chip derived from the brand colour rather than a fixed ramp step, so it stays
   correct in both themes (a literal primary-50 would glare in dark mode). color-mix is
   safe here — the canvas-parsing limitation that rules it out for charts doesn't apply
   to ordinary CSS. */
.sidebar__link--active {
  background: color-mix(in oklab, var(--ui-primary) 12%, transparent);
  color: var(--ui-primary);
  font-weight: 600;
}

.sidebar__label {
  white-space: nowrap;
}
</style>
