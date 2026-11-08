import type { H3Event } from 'h3'
import { CURRENCY_CODES, DEFAULT_CURRENCY } from '../../../app/constants/markets'
import type { OrgSettings } from '../../../app/types/api'
import { readStateCookie, writeStateCookie } from './stateCookie'

/**
 * Mock organization config, kept in a cookie rather than in server memory: a deployment
 * runs several server instances, and memory would give each its own copy. A cookie is
 * per browser, so an Admin's change reaches every role signed in from that browser and
 * no other; the real backend keeps one copy in its database.
 */
const COOKIE = 'insight-mock-org-settings'

/** The cookie is user input: a value that isn't a supported currency reads as the default. */
export function parseOrgSettings(stored: unknown): OrgSettings {
  const currency = (stored as Partial<OrgSettings> | null)?.presentationCurrency
  const valid = CURRENCY_CODES.includes(currency as (typeof CURRENCY_CODES)[number])
  return { presentationCurrency: valid ? currency! : DEFAULT_CURRENCY }
}

export function getOrgSettings(event: H3Event): OrgSettings {
  return parseOrgSettings(readStateCookie(event, COOKIE))
}

export function updateOrgSettings(event: H3Event, patch: Partial<OrgSettings>): OrgSettings {
  const next = parseOrgSettings({ ...getOrgSettings(event), ...patch })
  writeStateCookie(event, COOKIE, next)
  return next
}
