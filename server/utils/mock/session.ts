import type { H3Event } from 'h3'
import { ROLES } from '../../../app/constants/permissions'
import type { Role } from '../../../app/types/api'

/** One demo user per role: in the mock, a role is a user. */
export const DEMO_USERS: Record<Role, { id: string; name: string; email: string }> = {
  admin: { id: 'u-001', name: 'Avery Chen', email: 'avery.chen@insight-os.demo' },
  analyst: { id: 'u-002', name: 'Jordan Miles', email: 'jordan.miles@insight-os.demo' },
  viewer: { id: 'u-003', name: 'Sam Okafor', email: 'sam.okafor@insight-os.demo' },
}

/**
 * The role a request's bearer token was issued for, or `undefined` when it carries none.
 * Demo tokens are `demo.<role>.<stamp>`, and this is the only place the mock reads one,
 * since there is no real session lookup to ask instead.
 */
export function sessionRole(event: H3Event): Role | undefined {
  const header = getHeader(event, 'authorization')
  const tokenRole = header?.replace(/^Bearer\s+/i, '').split('.')[1]
  return ROLES.find((r) => r === tokenRole)
}
