import type { H3Event } from 'h3'
import { MARKETS } from '../../../app/constants/markets'
import type { UserSettings } from '../../../app/types/api'
import { readStateCookie, writeStateCookie } from './stateCookie'

/**
 * Mock user preferences, kept in a cookie per user rather than in server memory: a
 * deployment runs several server instances, and memory would give each its own copy.
 * The real backend keeps them in its database.
 */
const DEFAULTS: UserSettings = { defaultMarket: 'All' }

const cookieName = (userId: string) => `insight-mock-user-settings-${userId}`

/** The cookie is user input: a value that isn't a market reads as the default. */
export function parseUserSettings(stored: unknown): UserSettings {
  const market = (stored as Partial<UserSettings> | null)?.defaultMarket
  const valid = market === 'All' || MARKETS.includes(market as (typeof MARKETS)[number])
  return valid ? { defaultMarket: market! } : { ...DEFAULTS }
}

export function getUserSettings(event: H3Event, userId: string): UserSettings {
  return parseUserSettings(readStateCookie(event, cookieName(userId)))
}

export function updateUserSettings(
  event: H3Event,
  userId: string,
  patch: Partial<UserSettings>,
): UserSettings {
  const next = { ...getUserSettings(event, userId), ...patch }
  writeStateCookie(event, cookieName(userId), next)
  return next
}
