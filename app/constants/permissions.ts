import type { Role } from '~/types/api'

/**
 * THE RBAC matrix — the single source of truth (product spec §3).
 *
 * Never scatter `role === 'admin'` checks through components; go through useCan().
 * These client-side checks are UX affordances ONLY — the backend must re-enforce every
 * one of them. A user who forges a role in a cookie must still be refused server-side.
 */
export const PERMISSIONS = {
  'analytics:view': ['admin', 'analyst', 'viewer'],
  'ai:chat': ['admin', 'analyst', 'viewer'],
  'export:csv': ['admin', 'analyst'],
  'campaigns:manage': ['admin', 'analyst'],
  'datasources:manage': ['admin'],
  'team:manage': ['admin'],
  'settings:admin': ['admin'],
} as const satisfies Record<string, readonly Role[]>

export type Ability = keyof typeof PERMISSIONS

export const ABILITIES = Object.keys(PERMISSIONS) as Ability[]

/**
 * How a DENIED ability presents in the UI.
 *
 * 'hidden'   — omit the nav entry, the route, and the controls entirely.
 * 'disabled' — keep the control visible but inert, with an explanatory tooltip.
 *
 * Only CSV export is 'disabled' per the spec; everything else is hidden outright.
 * Getting this wrong (disabling where the spec says hide) leaks the existence of
 * features a role isn't entitled to see.
 */
export const DENIED_TREATMENT: Record<Ability, 'hidden' | 'disabled'> = {
  'analytics:view': 'hidden',
  'ai:chat': 'hidden',
  'export:csv': 'disabled',
  'campaigns:manage': 'hidden',
  'datasources:manage': 'hidden',
  'team:manage': 'hidden',
  'settings:admin': 'hidden',
}

export const ROLES: Role[] = ['admin', 'analyst', 'viewer']

/** Pure predicate — usable in tests, middleware, and server code alike. */
export function roleCan(role: Role, ability: Ability): boolean {
  return (PERMISSIONS[ability] as readonly Role[]).includes(role)
}
