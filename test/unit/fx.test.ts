import { describe, expect, it } from 'vitest'
import {
  convertDay,
  dailyRates,
  emptyMoney,
  MARKET_NATIVE_CURRENCY,
  roundMoney,
  sumMoney,
} from '../../server/utils/mock/fx'
import { dailyMetrics, dailyRevenueMoney, isAnomalousDay } from '../../server/utils/mock/markets'
import { eachDay, resolveRange } from '../../server/utils/mock/dates'

describe('fx — historical daily conversion', () => {
  it('is deterministic: the same day reproduces the same rates and totals', () => {
    expect(dailyRates('2026-03-04')).toEqual(dailyRates('2026-03-04'))
    expect(convertDay(1000, 'USD', '2026-03-04')).toEqual(convertDay(1000, 'USD', '2026-03-04'))
  })

  it('returns an independent total for every supported currency', () => {
    const money = convertDay(10_000, 'JPY', '2026-03-04')
    expect(Object.keys(money).sort()).toEqual(['EUR', 'JPY', 'TWD', 'USD'])
    // Converting a native amount back into its own currency is identity.
    expect(money.JPY).toBeCloseTo(10_000, 6)
    for (const v of Object.values(money)) expect(v).toBeGreaterThan(0)
  })

  it('rates actually differ day to day (otherwise the daily rule would be meaningless)', () => {
    expect(dailyRates('2026-03-04').JPY).not.toBeCloseTo(dailyRates('2026-03-05').JPY, 6)
  })

  /**
   * The contract's non-negotiable rule: a currency total is the SUM OF DAILY-CONVERTED
   * amounts — never the native total multiplied by one period-end rate. If this ever
   * passed, someone had collapsed the conversion to a single rate.
   */
  it('sums daily-converted amounts rather than converting a period total once', () => {
    const days = eachDay(new Date('2026-03-01T00:00:00Z'), new Date('2026-03-30T00:00:00Z'))
    const nativePerDay = 1_000_000 // JPY

    const dayByDay = sumMoney(days.map((d) => convertDay(nativePerDay, 'JPY', d)))
    const singleRate = convertDay(nativePerDay * days.length, 'JPY', days.at(-1)!)

    // Identity currency matches either way; cross-currency totals must NOT.
    expect(dayByDay.JPY).toBeCloseTo(singleRate.JPY, 4)
    expect(dayByDay.USD).not.toBeCloseTo(singleRate.USD, 2)
    expect(dayByDay.EUR).not.toBeCloseTo(singleRate.EUR, 2)
  })

  it('rounds JPY to whole units and keeps an empty money map zeroed', () => {
    const rounded = roundMoney({ USD: 1.005, JPY: 1234.7, TWD: 10.123, EUR: 2.345 })
    expect(Number.isInteger(rounded.JPY)).toBe(true)
    expect(rounded.JPY).toBe(1235)
    expect(emptyMoney()).toEqual({ USD: 0, JPY: 0, TWD: 0, EUR: 0 })
  })

  it('maps each market to its native currency', () => {
    expect(MARKET_NATIVE_CURRENCY).toEqual({ US: 'USD', JP: 'JPY', TW: 'TWD', DE: 'EUR' })
  })
})

describe('markets — seeded data and the JP anomaly', () => {
  const today = new Date('2026-03-30T00:00:00Z')

  it('produces stable metrics for a given market/day', () => {
    expect(dailyMetrics('US', '2026-03-10', today)).toEqual(dailyMetrics('US', '2026-03-10', today))
  })

  it('flags the JP anomaly only inside the trailing 7-day window', () => {
    expect(isAnomalousDay('JP', '2026-03-30', today)).toBe(true) // last day
    expect(isAnomalousDay('JP', '2026-03-24', today)).toBe(true) // first day of the window
    expect(isAnomalousDay('JP', '2026-03-23', today)).toBe(false) // just outside
  })

  it('depresses JP conversion inside the anomaly window versus before it', () => {
    const during = dailyMetrics('JP', '2026-03-30', today).conversionRate
    const before = dailyMetrics('JP', '2026-03-10', today).conversionRate
    expect(during).toBeLessThan(before)
  })

  it('leaves other markets unaffected by the anomaly', () => {
    expect(isAnomalousDay('US', '2026-03-30', today)).toBe(false)
    expect(isAnomalousDay('DE', '2026-03-30', today)).toBe(false)
  })

  it('returns revenue as a rounded four-currency map', () => {
    const money = dailyRevenueMoney('JP', '2026-03-10', today)
    expect(Object.keys(money).sort()).toEqual(['EUR', 'JPY', 'TWD', 'USD'])
    expect(Number.isInteger(money.JPY)).toBe(true)
  })
})

describe('dates — range resolution', () => {
  const today = new Date('2026-03-30T00:00:00Z')

  it('resolves range tokens to the right number of days', () => {
    expect(resolveRange({ range: '7d' }, today).days).toHaveLength(7)
    expect(resolveRange({ range: '30d' }, today).days).toHaveLength(30)
    expect(resolveRange({ range: '90d' }, today).days).toHaveLength(90)
  })

  it('defaults to 30d and honours explicit from/to', () => {
    expect(resolveRange({}, today).days).toHaveLength(30)
    const explicit = resolveRange({ from: '2026-03-01', to: '2026-03-10' }, today)
    expect(explicit.days).toHaveLength(10)
    expect(explicit.from).toBe('2026-03-01')
    expect(explicit.to).toBe('2026-03-10')
  })
})
