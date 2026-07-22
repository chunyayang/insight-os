import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zhTW from '../../i18n/locales/zh-TW.json'
import { errorKey, errorKeyFromCode, isApiError } from '../../app/utils/errors'

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

  it('narrows a typed ApiError', () => {
    expect(isApiError({ error: { code: 'NOT_FOUND', message: 'nope' } })).toBe(true)
    expect(isApiError({ nope: true })).toBe(false)
    expect(errorKey({ error: { code: 'NOT_FOUND', message: 'nope' } })).toBe(
      'errors.codes.notFound',
    )
  })
})
