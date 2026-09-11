import { describe, expect, it } from 'vitest'
import { readFilterParam, writeFilterParam } from '../../app/utils/urlFilter'
import { MARKET_FILTERS, type MarketFilter } from '../../app/constants/markets'

const ALL: MarketFilter = 'All'

describe('readFilterParam — the URL is user input', () => {
  it('accepts a value from the allowed set', () => {
    expect(readFilterParam('JP', MARKET_FILTERS, ALL)).toBe('JP')
  })

  it('falls back rather than passing an unknown market to the wire', () => {
    expect(readFilterParam('XX', MARKET_FILTERS, ALL)).toBe('All')
    expect(readFilterParam('jp', MARKET_FILTERS, ALL)).toBe('All') // case-sensitive by design
    expect(readFilterParam('', MARKET_FILTERS, ALL)).toBe('All')
  })

  it('falls back when the param is absent or valueless (`?market`)', () => {
    expect(readFilterParam(undefined, MARKET_FILTERS, ALL)).toBe('All')
    expect(readFilterParam(null, MARKET_FILTERS, ALL)).toBe('All')
  })

  it('takes the first entry of a repeated param instead of erroring', () => {
    expect(readFilterParam(['JP', 'US'], MARKET_FILTERS, ALL)).toBe('JP')
    expect(readFilterParam(['XX', 'JP'], MARKET_FILTERS, ALL)).toBe('All')
    expect(readFilterParam([], MARKET_FILTERS, ALL)).toBe('All')
  })

  it('honours a non-default fallback', () => {
    expect(readFilterParam(undefined, MARKET_FILTERS, 'JP')).toBe('JP')
  })
})

describe('writeFilterParam — clean URLs, no mutation', () => {
  it('writes a non-default value', () => {
    expect(writeFilterParam({}, 'market', 'JP', ALL)).toEqual({ market: 'JP' })
  })

  it('drops the key when the value equals the default', () => {
    expect(writeFilterParam({ market: 'JP' }, 'market', ALL, ALL)).toEqual({})
  })

  it('drops the key against a seeded default, so the seed never appears in the URL', () => {
    expect(writeFilterParam({ market: 'US' }, 'market', 'JP', 'JP')).toEqual({})
  })

  it('leaves other params alone', () => {
    const query = { segment: 'vip', page: '3' }
    expect(writeFilterParam(query, 'market', 'JP', ALL)).toEqual({
      segment: 'vip',
      page: '3',
      market: 'JP',
    })
  })

  it('returns a new object — mutating route.query would not navigate', () => {
    const query = { market: 'JP' }
    const next = writeFilterParam(query, 'market', 'US', ALL)
    expect(next).not.toBe(query)
    expect(query).toEqual({ market: 'JP' })
  })
})

describe('round trip', () => {
  it('every market survives write → read', () => {
    for (const market of MARKET_FILTERS) {
      const query = writeFilterParam({}, 'market', market, ALL)
      expect(readFilterParam(query.market as string | undefined, MARKET_FILTERS, ALL)).toBe(market)
    }
  })
})
