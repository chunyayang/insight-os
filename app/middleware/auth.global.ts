import { roleCan, type Ability } from '~/constants/permissions'

/**
 * Route guard. Global so every route is protected by default (fail closed) — a new page
 * is guarded the moment it exists, rather than only if someone remembers to opt in.
 *
 * Pages declare their requirement with:
 *   definePageMeta({ ability: 'team:manage' })
 *
 * Runs on the server too (the session lives in cookies), so an unauthorized user is
 * redirected before any protected markup is ever rendered.
 *
 * UX enforcement only — the backend must re-check on every request.
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  const isPublic = to.meta.public === true || to.path === '/login'

  if (isPublic) {
    // Don't strand an authenticated user on the login screen.
    if (auth.isAuthenticated && to.path === '/login') return navigateTo('/')
    return
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  const ability = to.meta.ability as Ability | undefined
  if (ability && !roleCan(auth.role, ability)) {
    // The route is *(Hidden)* for this role — send them somewhere they can be.
    return navigateTo('/')
  }
})
