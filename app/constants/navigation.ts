import type { Ability } from '~/constants/permissions'

export interface NavItem {
  /** i18n key suffix under nav.items.* */
  key: string
  to: string
  /** Iconify name (`i-lucide-*`), rendered through `<UIcon>`. */
  icon: string
  /** When set, the entry is omitted entirely for roles lacking it (*(Hidden)* in spec §3). */
  ability?: Ability
}

export interface NavGroup {
  /** i18n key suffix under nav.groups.* */
  key: string
  items: NavItem[]
}

/**
 * Sidebar information architecture. Route paths mirror this structure, so the nav and
 * the pages/ tree stay in step.
 *
 * Entries carrying an `ability` are HIDDEN (not disabled) for roles without it — the
 * middleware enforces the matching route guard, so hiding the link and blocking the URL
 * are driven by the same permission map.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'main',
    items: [
      { key: 'dashboard', to: '/', icon: 'i-lucide-house' },
      {
        key: 'analytics',
        to: '/analytics',
        icon: 'i-lucide-chart-line',
        ability: 'analytics:view',
      },
      {
        key: 'aiAssistant',
        to: '/ai-assistant',
        icon: 'i-lucide-messages-square',
        ability: 'ai:chat',
      },
    ],
  },
  {
    key: 'manage',
    items: [
      { key: 'customers', to: '/customers', icon: 'i-lucide-users' },
      {
        key: 'campaigns',
        to: '/campaigns',
        icon: 'i-lucide-megaphone',
        ability: 'campaigns:manage',
      },
      {
        key: 'dataSources',
        to: '/data-sources',
        icon: 'i-lucide-database',
        ability: 'datasources:manage',
      },
    ],
  },
  {
    key: 'org',
    items: [
      { key: 'team', to: '/team', icon: 'i-lucide-user-cog', ability: 'team:manage' },
      { key: 'notifications', to: '/notifications', icon: 'i-lucide-bell' },
      { key: 'settings', to: '/settings', icon: 'i-lucide-settings' },
    ],
  },
]

/**
 * Routes that own a page-level market control, and therefore the routes a `market`
 * query param is a legible view onto (spec §2: no URL param without a visible control
 * on that page). Nav links carry the current market only to these.
 *
 * `/` is deliberately absent. Its KPI cards are cross-market aggregates with no market
 * control (spec §4.2), and the revenue trend chart's tabs scope that one chart rather
 * than the page — neither makes `?market=` on `/` something a reader could point at.
 * See `.claude/doc/url-backed-filters.md`.
 *
 * Matched exactly, not by prefix: a detail route such as `/customers/:id` shows one
 * record and filters nothing, so it earns an entry here only if it grows its own control.
 */
export const MARKET_SCOPED_ROUTES: readonly string[] = [
  '/analytics',
  '/ai-assistant',
  '/customers',
  '/campaigns',
]

export function acceptsMarketParam(path: string): boolean {
  return MARKET_SCOPED_ROUTES.includes(path)
}
