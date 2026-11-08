import { CURRENCY_CODES } from '../../../app/constants/markets'
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
  const currency = body?.presentationCurrency
  if (currency !== undefined && !CURRENCY_CODES.includes(currency)) {
    throw apiError(
      400,
      'VALIDATION_FAILED',
      `presentationCurrency must be one of ${CURRENCY_CODES.join(', ')}.`,
      { field: 'presentationCurrency' },
    )
  }

  await mockLatency('settings-org-update')
  const patch = currency === undefined ? {} : { presentationCurrency: currency }
  return ok(updateOrgSettings(event, patch))
})
