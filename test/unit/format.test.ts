import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDelta,
  formatMoney,
  formatMonthDay,
  formatPercent,
  formatRelativeTime,
  intlLocale,
} from '../../app/utils/format'
import {
  currencyFractionDigits,
  MARKET_COLOR,
  MARKET_CURRENCY,
  MARKETS,
} from '../../app/constants/markets'
import type { Money } from '../../app/types/api'

const money: Money = { USD: 1234.567, JPY: 193_456.7, TWD: 39_876.5, EUR: 1135.4 }

describe('currency formatting', () => {
  /**
   * Both are 0-decimal on screen, for different reasons: JPY has no minor unit, while
   * TWD has one that Taiwanese pricing ignores. Intl disagrees about TWD — left to
   * itself it renders `NT$1,234.50` — so this pins the override, not the default.
   */
  it('renders JPY and TWD with ZERO decimals', () => {
    for (const c of ['JPY', 'TWD'] as const) {
      expect(currencyFractionDigits(c)).toBe(0)
      expect(formatCurrency(1234.5, c, 'en-US')).not.toMatch(/\.\d/)
    }
    expect(formatCurrency(193_456.7, 'JPY', 'en-US')).toContain('193,457')
    expect(formatCurrency(39_876.5, 'TWD', 'en-US')).toContain('39,877')
  })

  it('renders USD and EUR with two decimals', () => {
    for (const c of ['USD', 'EUR'] as const) {
      expect(currencyFractionDigits(c)).toBe(2)
      expect(formatCurrency(1234.5, c, 'en-US')).toMatch(/\.\d{2}/)
    }
  })

  it('picks the selected key from a Money map without converting', () => {
    // Each currency is an independent server-computed total; formatting must not derive
    // one from another, so the rendered figure has to match the map value exactly.
    expect(formatMoney(money, 'USD', 'en-US')).toBe(formatCurrency(money.USD, 'USD', 'en-US'))
    expect(formatMoney(money, 'JPY', 'en-US')).toBe(formatCurrency(money.JPY, 'JPY', 'en-US'))
    expect(formatMoney(money, 'EUR', 'en-US')).toBe(formatCurrency(money.EUR, 'EUR', 'en-US'))
  })

  it('formats the same amount differently per locale', () => {
    expect(formatCurrency(1234.5, 'USD', 'en-US')).not.toBe(formatCurrency(1234.5, 'USD', 'zh-TW'))
  })

  it('abbreviates axis amounts with K/M/B and the locale’s own symbol', () => {
    expect(formatCompactCurrency(100_000, 'USD', 'en-US')).toBe('$100K')
    expect(formatCompactCurrency(100_000, 'USD', 'zh-TW')).toBe('US$100K')
    expect(formatCompactCurrency(15_000_000, 'JPY', 'en-US')).toBe('¥15M')
    expect(formatCompactCurrency(-100_000, 'EUR', 'en-US')).toBe('-€100K')
  })

  it('never abbreviates with 萬/億, even for TWD in zh-TW', () => {
    expect(formatCompactCurrency(3_000_000, 'TWD', 'zh-TW')).toBe('$3M')
    expect(formatCompactCurrency(250_000_000, 'TWD', 'zh-TW')).not.toMatch(/[萬億]/)
  })

  it('never shows a zero-decimal minor unit below the first abbreviation step', () => {
    expect(formatCompactCurrency(999.5, 'JPY', 'en-US')).toBe('¥1K')
    expect(formatCompactCurrency(999.4, 'TWD', 'zh-TW')).toBe('$999')
  })
})

describe('calendar dates', () => {
  // Simulates the viewer's ambient zone without touching TZ: any formatter that doesn't
  // pin its own zone picks this one up, as it would in the browser.
  function inAmbientZone(timeZone: string) {
    const RealDateTimeFormat = Intl.DateTimeFormat
    return vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      locale?: string | string[],
      options?: Intl.DateTimeFormatOptions,
    ) {
      return new RealDateTimeFormat(locale, { timeZone, ...options })
    } as unknown as typeof Intl.DateTimeFormat)
  }

  afterEach(() => vi.restoreAllMocks())

  it('drops the year for dense axes', () => {
    expect(formatMonthDay('2026-09-17', 'en-US')).toBe('Sep 17')
    expect(formatMonthDay('2026-09-17', 'zh-TW')).toBe('9月17日')
  })

  it('renders the same calendar day on both sides of UTC', () => {
    for (const zone of ['America/Los_Angeles', 'Asia/Taipei']) {
      inAmbientZone(zone)
      expect(formatMonthDay('2026-09-17', 'en-US')).toBe('Sep 17')
      vi.restoreAllMocks()
    }
  })
})

describe('markets map', () => {
  it('gives every market a functional currency and a colour in both themes', () => {
    expect(Object.keys(MARKET_CURRENCY).sort()).toEqual([...MARKETS].sort())
    expect(Object.keys(MARKET_COLOR).sort()).toEqual([...MARKETS].sort())
  })
})

describe('percent, delta and relative time', () => {
  it('treats values as ratios', () => {
    expect(formatPercent(0.031, 'en-US')).toBe('3.1%')
  })

  it('always signs a delta so trend direction is unambiguous', () => {
    expect(formatDelta(0.042, 'en-US')).toBe('+4.2%')
    expect(formatDelta(-0.18, 'en-US')).toBe('-18.0%')
  })

  it('formats relative time against a fixed now', () => {
    const now = new Date('2026-03-30T12:00:00Z')
    expect(formatRelativeTime('2026-03-30T10:00:00Z', 'en-US', now)).toBe('2 hours ago')
  })
})

describe('locale mapping', () => {
  it('maps i18n codes to Intl locales, defaulting to en-US', () => {
    expect(intlLocale('zh-TW')).toBe('zh-TW')
    expect(intlLocale('en')).toBe('en-US')
    expect(intlLocale('anything-else')).toBe('en-US')
  })
})
