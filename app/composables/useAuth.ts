import { partialMatchKey, useQueryClient, type QueryKey } from '@tanstack/vue-query'
import { orgSettingsKeys } from '~/composables/queries/useOrgSettingsQuery'
import { userSettingsKeys } from '~/composables/queries/useUserSettingsQuery'
import type { Role } from '~/types/api'

/** Settings belong to the user and the organization, not the role, so a role switch keeps them. */
function isSessionSettings(queryKey: QueryKey) {
  return (
    partialMatchKey(queryKey, orgSettingsKeys.all) ||
    partialMatchKey(queryKey, userSettingsKeys.all)
  )
}

/**
 * Session changes and their teardown. Components call these, never the auth store's
 * `signOut` / `switchRole`, which only rewrite the session cookies.
 */
export function useAuth() {
  const auth = useAuthStore()
  const queryClient = useQueryClient()
  const route = useRoute()

  /**
   * A full page load empties the query cache, Pinia and every `useState` by construction, so
   * no client state can outlive the session by being left off a list of things to clear.
   */
  async function signOut() {
    auth.signOut()
    // useCookie writes the cookie from a watcher. Leaving first would send the old token, and
    // the route guard would bounce `/login` back to `/`.
    await nextTick()
    await navigateTo('/login', { external: true })
  }

  async function switchRole(next: Role) {
    if (!auth.user || next === auth.role) return
    auth.switchRole(next)
    // Reset, not remove: the page stays mounted, and its queries must refetch rather than
    // keep showing the previous role's data from entries no longer in the cache.
    const reset = queryClient.resetQueries({
      predicate: ({ queryKey }) => !isSessionSettings(queryKey),
    })
    // Same location, so `force` is what makes the route guard run again for the new role.
    const guard = navigateTo(
      { path: route.path, query: route.query, hash: route.hash, force: true },
      { replace: true },
    )
    await Promise.all([reset, guard])
  }

  return { signOut, switchRole }
}
