import type { Role, SessionUser } from '~/types/api'

/**
 * Session state: who is signed in, as what role, with what token.
 *
 * Backed by COOKIES rather than plain refs so the session survives reload and — more
 * importantly — is readable during SSR, which lets the route middleware make the same
 * decision on the server as on the client (no auth flash, no hydration mismatch).
 *
 * The token cookie is the one the Axios request interceptor reads (plugins/api.ts).
 *
 * This is client state, so it belongs in Pinia. Server data never lives here.
 */
export const useAuthStore = defineStore('auth', () => {
  const cookieOptions = {
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
  }

  const token = useCookie<string | null>('insight-token', {
    ...cookieOptions,
    default: () => null,
  })
  const user = useCookie<SessionUser | null>('insight-session', {
    ...cookieOptions,
    default: () => null,
  })

  const isAuthenticated = computed(() => Boolean(token.value && user.value))
  /** Defaults to the least-privileged role so a broken session can never over-grant. */
  const role = computed<Role>(() => user.value?.role ?? 'viewer')

  function signIn(payload: { token: string; user: SessionUser }) {
    token.value = payload.token
    user.value = payload.user
  }

  /** Demo affordance from the spec: re-seed the session as another role and re-apply RBAC. */
  function switchRole(next: Role) {
    if (!user.value) return
    user.value = { ...user.value, role: next }
  }

  function signOut() {
    token.value = null
    user.value = null
  }

  return { token, user, isAuthenticated, role, signIn, switchRole, signOut }
})
