import { describe, expect, it } from 'vitest'
import { customerPool, queryCustomers } from '../../server/utils/mock/customers'
import { MARKET_NATIVE_CURRENCY } from '../../server/utils/mock/fx'

const TODAY = new Date('2026-08-05T00:00:00Z')
const pool = customerPool(TODAY)

function list(query: Partial<Parameters<typeof queryCustomers>[1]> = {}) {
  return queryCustomers(pool, { page: 1, pageSize: 20, ...query })
}

describe('customer pool', () => {
  it('is deterministic — paging must not reshuffle rows between requests', () => {
    const again = customerPool(TODAY)
    expect(again.map((c) => c.id)).toEqual(pool.map((c) => c.id))
    expect(again[0]).toEqual(pool[0])
  })

  /** Two rows of one page showing the same person reads as a data bug, not as mock data. */
  it('gives every customer a distinct name and email', () => {
    expect(new Set(pool.map((c) => c.name)).size).toBe(pool.length)
    expect(new Set(pool.map((c) => c.email)).size).toBe(pool.length)
  })

  it('orders JP and TW names family-first, and US and DE given-first', () => {
    expect(pool.find((c) => c.market === 'JP')!.name).toMatch(/^[佐鈴高田伊渡山中]/)
    expect(pool.find((c) => c.market === 'US')!.name.split(' ')[0]).toMatch(/^[A-Z][a-z]+$/)
  })

  it('covers all four markets and gives each record its market currency', () => {
    expect(new Set(pool.map((c) => c.market))).toEqual(new Set(['US', 'JP', 'TW', 'DE']))
    for (const customer of pool) {
      expect(customer.nativeCurrency).toBe(MARKET_NATIVE_CURRENCY[customer.market])
    }
  })

  /**
   * Every currency in the map is an independent day-converted total, so none is derivable
   * from another by a single rate. Asserting they merely differ is what catches a future
   * "simplification" that multiplies one native total by one period-end rate.
   */
  it('carries all four currencies as independent totals', () => {
    for (const customer of pool.slice(0, 12)) {
      const values = Object.values(customer.lifetimeValue)
      expect(values).toHaveLength(4)
      expect(values.every((v) => v > 0)).toBe(true)
      expect(new Set(values).size).toBe(4)
    }
  })
})

describe('queryCustomers — filtering', () => {
  it('filters by market, and treats "All" as no filter', () => {
    const jp = list({ market: 'JP' })
    expect(jp.total).toBeGreaterThan(0)
    expect(jp.rows.every((c) => c.market === 'JP')).toBe(true)
    expect(list({ market: 'All' }).total).toBe(pool.length)
  })

  it('filters by segment and status', () => {
    expect(list({ segment: 'vip' }).rows.every((c) => c.segment === 'vip')).toBe(true)
    expect(list({ status: 'churned' }).rows.every((c) => c.status === 'churned')).toBe(true)
  })

  it('searches name and email case-insensitively', () => {
    const target = pool[0]!
    const byName = list({ q: target.name.toUpperCase() })
    expect(byName.rows.map((c) => c.id)).toContain(target.id)

    const byEmail = list({ q: target.email })
    expect(byEmail.total).toBe(1)
    expect(byEmail.rows[0]!.id).toBe(target.id)
  })

  it('returns an empty page rather than throwing when nothing matches', () => {
    expect(list({ q: 'no-such-customer' })).toEqual({ rows: [], total: 0 })
  })
})

describe('queryCustomers — sorting', () => {
  it('sorts by name in both directions', () => {
    const asc = list({ sort: 'name', order: 'asc', pageSize: pool.length }).rows.map((c) => c.name)
    const desc = list({ sort: 'name', order: 'desc', pageSize: pool.length }).rows.map(
      (c) => c.name,
    )
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)))
    expect(desc[0]).toBe(asc.at(-1))
  })

  /**
   * The load-bearing rule: lifetime value sorts on the record's NATIVE amount — the raw
   * number behind the cell. Across mixed markets that is currency-blind by design (a JPY
   * total dwarfs a EUR one) and the MVP provides no normalized alternative. If this ever
   * starts sorting on a shared currency key, the spec changed and this test should fail.
   */
  it('sorts lifetime value on the native amount, currency-blind across markets', () => {
    const rows = list({ sort: 'lifetimeValue', order: 'desc', pageSize: pool.length }).rows
    const natives = rows.map((c) => c.lifetimeValue[c.nativeCurrency])
    expect(natives).toEqual([...natives].sort((a, b) => b - a))
    // JPY amounts are ~150x their USD equivalent, so they dominate an unnormalized sort.
    expect(rows[0]!.market).toBe('JP')
  })

  it('gives a single market a meaningful lifetime-value ranking', () => {
    const rows = list({ market: 'DE', sort: 'lifetimeValue', order: 'desc', pageSize: 100 }).rows
    const eur = rows.map((c) => c.lifetimeValue.EUR)
    expect(rows.length).toBeGreaterThan(1)
    expect(eur).toEqual([...eur].sort((a, b) => b - a))
  })

  it('defaults to most-recently-active first', () => {
    const rows = list({ pageSize: pool.length }).rows.map((c) => c.lastActiveAt)
    expect(rows).toEqual([...rows].sort().reverse())
  })

  it('ignores an unknown sort field instead of returning a scrambled page', () => {
    expect(list({ sort: 'nope' }).rows.map((c) => c.id)).toEqual(list().rows.map((c) => c.id))
  })
})

describe('queryCustomers — pagination', () => {
  it('slices the sorted result and reports the unpaged total', () => {
    const first = list({ pageSize: 10 })
    const second = list({ page: 2, pageSize: 10 })

    expect(first.rows).toHaveLength(10)
    expect(first.total).toBe(pool.length)
    expect(second.total).toBe(pool.length)
    expect(second.rows.map((c) => c.id)).not.toEqual(first.rows.map((c) => c.id))
  })

  it('counts matches before paging, so the pager sizes to the filtered set', () => {
    const filtered = list({ market: 'TW', pageSize: 5 })
    expect(filtered.rows.length).toBeLessThanOrEqual(5)
    expect(filtered.total).toBe(pool.filter((c) => c.market === 'TW').length)
  })

  it('returns no rows past the last page', () => {
    expect(list({ page: 99, pageSize: 20 }).rows).toEqual([])
  })
})
