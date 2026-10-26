import type { UserSettings } from '../../../app/types/api'

/**
 * In-memory mock user preferences, keyed by user id, for the life of the dev server
 * (resets on restart). A user with no entry yet reads the defaults.
 */
const DEFAULTS: UserSettings = { defaultMarket: 'All' }
const state = new Map<string, UserSettings>()

export function getUserSettings(userId: string): UserSettings {
  return { ...DEFAULTS, ...state.get(userId) }
}

export function updateUserSettings(userId: string, patch: Partial<UserSettings>): UserSettings {
  const next = { ...getUserSettings(userId), ...patch }
  state.set(userId, next)
  return { ...next }
}
