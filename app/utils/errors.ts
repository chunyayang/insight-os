import type { ApiError } from '~/types/api'

/**
 * Map a machine-readable API error code to its i18n key.
 *
 * The contract guarantees every failure carries a `code` (the Axios interceptor
 * synthesizes one for transport failures), so the UI localizes off the code and NEVER
 * renders the raw English `message` from the server.
 *
 *   'NETWORK_ERROR' -> 'errors.codes.networkError'
 */
export function errorKeyFromCode(code: string): string {
  const camel = code.toLowerCase().replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())
  return `errors.codes.${camel}`
}

/**
 * Pull the contract error out of a response body.
 *
 * Two shapes must both work:
 *  - `{ error: { code, message } }` — the contract proper (and the real backend).
 *  - `{ error: true, statusCode, data: { error: { code, message } } }` — what H3/Nitro
 *    produces when a handler throws createError({ data }). The mock throws that way, so
 *    without this the boolean `error: true` would masquerade as the error object.
 *
 * Returns null when the body carries no recognisable API error.
 */
export function extractApiError(body: unknown): ApiError | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>

  if (isApiError(record)) return record

  const wrapped = record.data
  if (isApiError(wrapped)) return wrapped

  return null
}

/** Narrow an unknown rejection to our typed ApiError shape. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiError).error?.code === 'string'
  )
}

/** i18n key for any thrown value, falling back to a generic message. */
export function errorKey(value: unknown): string {
  return isApiError(value) ? errorKeyFromCode(value.error.code) : 'errors.codes.unknown'
}
