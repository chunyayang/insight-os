import type { ApiResponse, OrgSettings } from '../../../app/types/api'

/** Organization config — the presentation currency Settings → General seeds into Pinia. */
export default defineEventHandler(async (): Promise<ApiResponse<OrgSettings>> => {
  await mockLatency('settings-org')
  return ok(getOrgSettings())
})
