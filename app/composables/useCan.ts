import { DENIED_TREATMENT, roleCan, type Ability } from '~/constants/permissions'

/**
 * The ONLY way components should ask about permissions.
 *
 *   <Button v-if="can('team:manage')" />                    <!-- hidden when denied -->
 *   <Button :disabled="!can('export:csv')" v-tooltip="…" /> <!-- disabled + tooltip -->
 *
 * Reactive: switching role via the demo role picker re-evaluates every guard instantly.
 * Client-side checks are UX only — the backend re-enforces them.
 */
export function useCan() {
  const auth = useAuthStore()

  const role = computed(() => auth.role)

  function can(ability: Ability): boolean {
    return roleCan(role.value, ability)
  }

  /** True when a denied ability should still render, but inert (CSV export only). */
  function isDisabledWhenDenied(ability: Ability): boolean {
    return DENIED_TREATMENT[ability] === 'disabled'
  }

  /** True when a denied ability must be omitted entirely (nav entry, route, controls). */
  function isHiddenWhenDenied(ability: Ability): boolean {
    return DENIED_TREATMENT[ability] === 'hidden'
  }

  /** Should this element render at all for the current role? */
  function shouldRender(ability: Ability): boolean {
    return can(ability) || isDisabledWhenDenied(ability)
  }

  return { can, role, shouldRender, isDisabledWhenDenied, isHiddenWhenDenied }
}
