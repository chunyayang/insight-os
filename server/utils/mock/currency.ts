import { CURRENCY_CODES } from '../../../app/constants/markets'
import type { CurrencyCode } from '../../../app/types/api'

/**
 * The `presentationCurrency` a request computing a cross-market comparison must carry.
 * Absent or unknown is refused rather than read from the org setting: the response must be
 * fully determined by its request, or a cache keyed on one currency can hold another's figures.
 */
export function requirePresentationCurrency(value: unknown): CurrencyCode {
  const currency = CURRENCY_CODES.find((c) => c === value)
  if (!currency) {
    throw apiError(
      400,
      'VALIDATION_FAILED',
      `presentationCurrency must be one of ${CURRENCY_CODES.join(', ')}.`,
      { field: 'presentationCurrency' },
    )
  }
  return currency
}
