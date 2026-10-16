import type { LocaleCode } from '../../../app/types/api'

export const LOCALES: LocaleCode[] = ['en', 'zh-TW']

/**
 * The `locale` an AI-text request must carry. Absent or unknown is refused rather than
 * defaulted: a silent fallback to English would look like a missing translation.
 */
export function requireLocale(value: unknown): LocaleCode {
  const locale = LOCALES.find((l) => l === value)
  if (!locale) {
    throw apiError(400, 'VALIDATION_FAILED', `locale must be one of ${LOCALES.join(', ')}.`, {
      field: 'locale',
    })
  }
  return locale
}
