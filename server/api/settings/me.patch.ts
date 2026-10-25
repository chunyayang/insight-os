import type { ApiResponse, UpdateUserSettingsRequest, UserSettings } from '../../../app/types/api'

/**
 * A user preference, so every role may write it (spec §4.10) — the only check is that
 * a user is signed in, and they can only ever write their own.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<UserSettings>> => {
  const role = sessionRole(event)
  if (!role) throw apiError(401, 'UNAUTHORIZED', 'Sign in to change your settings.')

  const body = await readBody<UpdateUserSettingsRequest>(event)
  const market = body?.defaultMarket
  if (market !== undefined && market !== 'All' && !MARKETS.includes(market)) {
    const allowed = ['All', ...MARKETS].join(', ')
    throw apiError(400, 'VALIDATION_FAILED', `defaultMarket must be one of ${allowed}.`, {
      field: 'defaultMarket',
    })
  }

  await mockLatency('settings-me-update')
  const patch = market === undefined ? {} : { defaultMarket: market }
  return ok(updateUserSettings(DEMO_USERS[role].id, patch))
})
