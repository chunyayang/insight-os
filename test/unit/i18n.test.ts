import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zhTW from '../../i18n/locales/zh-TW.json'
import { errorKey, errorKeyFromCode, extractApiError, isApiError } from '../../app/utils/errors'

/** Flatten a nested message object into dotted key paths. */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return v && typeof v === 'object' && !Array.isArray(v)
      ? keyPaths(v as Record<string, unknown>, path)
      : [path]
  })
}

describe('locale parity', () => {
  /**
   * A key present in one locale but missing in the other is a bug, not a "translate
   * later" TODO — both locales are first-class. This guard fails the build if they drift.
   */
  it('en and zh-TW define exactly the same keys', () => {
    const enKeys = keyPaths(en).sort()
    const zhKeys = keyPaths(zhTW).sort()

    expect(zhKeys.filter((k) => !enKeys.includes(k))).toEqual([]) // extra in zh-TW
    expect(enKeys.filter((k) => !zhKeys.includes(k))).toEqual([]) // missing from zh-TW
    expect(zhKeys).toEqual(enKeys)
  })

  it('has no empty or untranslated placeholder values', () => {
    const values = (obj: Record<string, unknown>): string[] =>
      Object.values(obj).flatMap((v) =>
        v && typeof v === 'object' ? values(v as Record<string, unknown>) : [String(v)],
      )

    for (const v of [...values(en), ...values(zhTW)]) {
      expect(v.trim()).not.toBe('')
      expect(v).not.toContain('【TODO】')
    }
  })
})

describe('api error -> i18n key', () => {
  it('converts SCREAMING_SNAKE codes to camelCase keys', () => {
    expect(errorKeyFromCode('NETWORK_ERROR')).toBe('errors.codes.networkError')
    expect(errorKeyFromCode('VALIDATION_FAILED')).toBe('errors.codes.validationFailed')
    expect(errorKeyFromCode('TIMEOUT')).toBe('errors.codes.timeout')
  })

  it('resolves to keys that actually exist in both locales', () => {
    const codes = ['NETWORK_ERROR', 'TIMEOUT', 'UNAUTHORIZED', 'NOT_FOUND', 'VALIDATION_FAILED']
    const enKeys = keyPaths(en)
    const zhKeys = keyPaths(zhTW)
    for (const code of codes) {
      const key = errorKeyFromCode(code)
      expect(enKeys).toContain(key)
      expect(zhKeys).toContain(key)
    }
  })

  it('falls back to a generic key for anything unrecognised', () => {
    expect(errorKey(new Error('boom'))).toBe('errors.codes.unknown')
    expect(errorKey(undefined)).toBe('errors.codes.unknown')
    expect(keyPaths(en)).toContain('errors.codes.unknown')
  })

  /**
   * Regression: H3/Nitro wraps a thrown createError payload under `data` and sets a
   * BOOLEAN `error: true` at the top level. A naive `'error' in body` check matches that
   * boolean and yields an ApiError with an undefined code — which silently degraded the
   * login screen to a generic "unknown error" instead of the credentials message.
   */
  it('extracts the error from both the contract shape and H3 createError wrapping', () => {
    const contractShape = { error: { code: 'NOT_FOUND', message: 'nope' } }
    expect(extractApiError(contractShape)).toEqual(contractShape)

    const h3Shape = {
      error: true,
      statusCode: 401,
      data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } },
    }
    expect(extractApiError(h3Shape)?.error.code).toBe('INVALID_CREDENTIALS')
    expect(errorKey(extractApiError(h3Shape))).toBe('errors.codes.invalidCredentials')
  })

  it('returns null when a body carries no recognisable API error', () => {
    expect(extractApiError(undefined)).toBeNull()
    expect(extractApiError('boom')).toBeNull()
    expect(extractApiError({ error: true, statusCode: 500 })).toBeNull()
  })

  it('narrows a typed ApiError', () => {
    expect(isApiError({ error: { code: 'NOT_FOUND', message: 'nope' } })).toBe(true)
    expect(isApiError({ nope: true })).toBe(false)
    expect(errorKey({ error: { code: 'NOT_FOUND', message: 'nope' } })).toBe(
      'errors.codes.notFound',
    )
  })
})
