import { roleCan } from '../../../app/constants/permissions'
import type { ApiResponse, OrgSettings, UpdateOrgSettingsRequest } from '../../../app/types/api'

/**
 * The presentation currency is organization policy, Admin only (spec §4.10). The
 * client disables the field for everyone else, but a forged role in a cookie must
 * still be refused here — client-side gating is UX, this is the enforcement.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<OrgSettings>> => {
  const role = sessionRole(event)

  if (!role || !roleCan(role, 'settings:org')) {
    throw apiError(403, 'FORBIDDEN', 'Only an Admin may change organization settings.')
  }

  const body = await readBody<UpdateOrgSettingsRequest>(event)
  await mockLatency('settings-org-update')

  return ok(updateOrgSettings(body))
})
