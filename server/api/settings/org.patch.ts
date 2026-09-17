import { ROLES, roleCan } from '../../../app/constants/permissions'
import type { ApiResponse, OrgSettings, UpdateOrgSettingsRequest } from '../../../app/types/api'

/**
 * The presentation currency is organization policy, Admin only (spec §4.10). The
 * client disables the field for everyone else, but a forged role in a cookie must
 * still be refused here — client-side gating is UX, this is the enforcement.
 *
 * Demo tokens are `demo.<role>.<stamp>` — the only place in the mock a role is read
 * from directly, since there is no real session lookup to ask instead.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<OrgSettings>> => {
  const header = getHeader(event, 'authorization')
  const tokenRole = header?.replace(/^Bearer\s+/i, '').split('.')[1]
  const role = ROLES.find((r) => r === tokenRole)

  if (!role || !roleCan(role, 'settings:org')) {
    throw apiError(403, 'FORBIDDEN', 'Only an Admin may change organization settings.')
  }

  const body = await readBody<UpdateOrgSettingsRequest>(event)
  await mockLatency('settings-org-update')

  return ok(updateOrgSettings(body))
})
