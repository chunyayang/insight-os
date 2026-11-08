import type { H3Event } from 'h3'

/** Long enough to outlive any demo; the value is a preference, not a credential. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

/** A JSON value the mock stored in a cookie, or `undefined` when absent or unreadable. */
export function readStateCookie(event: H3Event, name: string): unknown {
  const raw = getCookie(event, name)
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function writeStateCookie(event: H3Event, name: string, value: unknown): void {
  setCookie(event, name, JSON.stringify(value), {
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    sameSite: 'lax',
    httpOnly: true,
    secure: getRequestProtocol(event) === 'https',
  })
}
