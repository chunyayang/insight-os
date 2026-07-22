import type { Ability } from '~/constants/permissions'

/**
 * Type-safe route metadata so `definePageMeta({ ability: 'team:manage' })` is checked
 * against the real ability union — a typo becomes a compile error, not a silently
 * unguarded route.
 */
declare module '#app' {
  interface PageMeta {
    /** Required ability. The global auth middleware redirects roles that lack it. */
    ability?: Ability
    /** Opt a route out of the auth guard (e.g. /login). */
    public?: boolean
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    ability?: Ability
    public?: boolean
  }
}

export {}
