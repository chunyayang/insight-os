import type { ApiResponse, UserSettings } from '../../../app/types/api'

/** The signed-in user's own preferences — the default operating market. */
export default defineEventHandler(async (event): Promise<ApiResponse<UserSettings>> => {
  const role = sessionRole(event)
  if (!role) throw apiError(401, 'UNAUTHORIZED', 'Sign in to read your settings.')

  await mockLatency('settings-me')
  return ok(getUserSettings(DEMO_USERS[role].id))
})
