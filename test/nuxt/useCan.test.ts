import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCan } from '../../app/composables/useCan'
import { useAuthStore } from '../../app/stores/auth'

function signInAs(role: 'admin' | 'analyst' | 'viewer') {
  const auth = useAuthStore()
  auth.signIn({
    token: `demo.${role}`,
    user: { id: 'u-1', name: 'Test User', email: 't@x.com', role },
  })
  return auth
}

describe('useCan in the Nuxt runtime', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('gates abilities off the signed-in role', () => {
    signInAs('viewer')
    const { can } = useCan()

    expect(can('analytics:view')).toBe(true)
    expect(can('export:csv')).toBe(false)
    expect(can('team:manage')).toBe(false)
  })

  it('re-evaluates immediately when the demo role picker switches role', () => {
    const auth = signInAs('viewer')
    const { can, role } = useCan()

    expect(can('team:manage')).toBe(false)

    auth.switchRole('admin')

    // Reactive, not a snapshot — the topbar's Switch Role must re-apply RBAC live.
    expect(role.value).toBe('admin')
    expect(can('team:manage')).toBe(true)
    expect(can('export:csv')).toBe(true)
  })

  it('distinguishes hide-when-denied from disable-when-denied', () => {
    signInAs('viewer')
    const { shouldRender, isDisabledWhenDenied, isHiddenWhenDenied } = useCan()

    // CSV export stays visible but inert, with a tooltip.
    expect(isDisabledWhenDenied('export:csv')).toBe(true)
    expect(shouldRender('export:csv')).toBe(true)

    // Everything else disappears entirely rather than teasing the feature.
    expect(isHiddenWhenDenied('team:manage')).toBe(true)
    expect(shouldRender('team:manage')).toBe(false)
  })

  it('falls back to the least-privileged role when there is no session', () => {
    const { can, role } = useCan()
    expect(role.value).toBe('viewer')
    expect(can('team:manage')).toBe(false)
  })
})
