import type { Customer, CustomerSegment, CustomerStatus, MarketCode } from '../../../app/types/api'
import { convertDay, MARKET_NATIVE_CURRENCY, roundMoney, sumMoney } from './fx'
import { seeded } from './seed'
import { addDays, isoDate } from './dates'
import { MARKETS } from './markets'

/**
 * The Customers list — the first endpoint that exercises the list contract end to end
 * (page / pageSize / sort / order / q / market / segment / status).
 *
 * Names are per-market on purpose: the JP and TW rows put real CJK through the column
 * widths, the sort comparator and the CSV export, which is where locale bugs actually show
 * up. Each carries a romanized handle so the email column stays plausible.
 */

interface NamePart {
  text: string
  handle: string
}

const FAMILY: Record<MarketCode, NamePart[]> = {
  US: [
    { text: 'Mitchell', handle: 'mitchell' },
    { text: 'Brennan', handle: 'brennan' },
    { text: 'Delgado', handle: 'delgado' },
    { text: 'Carter', handle: 'carter' },
    { text: 'Nguyen', handle: 'nguyen' },
    { text: 'Whitfield', handle: 'whitfield' },
    { text: 'Okafor', handle: 'okafor' },
    { text: 'Rosenthal', handle: 'rosenthal' },
  ],
  JP: [
    { text: '佐藤', handle: 'sato' },
    { text: '鈴木', handle: 'suzuki' },
    { text: '高橋', handle: 'takahashi' },
    { text: '田中', handle: 'tanaka' },
    { text: '伊藤', handle: 'ito' },
    { text: '渡辺', handle: 'watanabe' },
    { text: '山本', handle: 'yamamoto' },
    { text: '中村', handle: 'nakamura' },
  ],
  TW: [
    { text: '陳', handle: 'chen' },
    { text: '林', handle: 'lin' },
    { text: '黃', handle: 'huang' },
    { text: '張', handle: 'chang' },
    { text: '李', handle: 'li' },
    { text: '王', handle: 'wang' },
    { text: '吳', handle: 'wu' },
    { text: '劉', handle: 'liu' },
  ],
  DE: [
    { text: 'Hoffmann', handle: 'hoffmann' },
    { text: 'Wagner', handle: 'wagner' },
    { text: 'Schneider', handle: 'schneider' },
    { text: 'Baumgartner', handle: 'baumgartner' },
    { text: 'Krüger', handle: 'krueger' },
    { text: 'Zimmermann', handle: 'zimmermann' },
    { text: 'Faßbender', handle: 'fassbender' },
    { text: 'Richter', handle: 'richter' },
  ],
}

const GIVEN: Record<MarketCode, NamePart[]> = {
  US: [
    { text: 'Ava', handle: 'ava' },
    { text: 'Noah', handle: 'noah' },
    { text: 'Sofia', handle: 'sofia' },
    { text: 'Elijah', handle: 'elijah' },
    { text: 'Harper', handle: 'harper' },
    { text: 'Mason', handle: 'mason' },
    { text: 'Layla', handle: 'layla' },
    { text: 'Jack', handle: 'jack' },
  ],
  JP: [
    { text: '陽菜', handle: 'hina' },
    { text: '大輔', handle: 'daisuke' },
    { text: '美咲', handle: 'misaki' },
    { text: '健一', handle: 'kenichi' },
    { text: 'さくら', handle: 'sakura' },
    { text: '翔太', handle: 'shota' },
    { text: '結衣', handle: 'yui' },
    { text: '拓海', handle: 'takumi' },
  ],
  TW: [
    { text: '佳蓉', handle: 'chiajung' },
    { text: '志豪', handle: 'chihhao' },
    { text: '詩涵', handle: 'shihan' },
    { text: '家瑋', handle: 'chiawei' },
    { text: '宛庭', handle: 'wanting' },
    { text: '柏翰', handle: 'pohan' },
    { text: '雅琪', handle: 'yachi' },
    { text: '冠廷', handle: 'kuanting' },
  ],
  DE: [
    { text: 'Lena', handle: 'lena' },
    { text: 'Jonas', handle: 'jonas' },
    { text: 'Mia', handle: 'mia' },
    { text: 'Felix', handle: 'felix' },
    { text: 'Emilia', handle: 'emilia' },
    { text: 'Lukas', handle: 'lukas' },
    { text: 'Marie', handle: 'marie' },
    { text: 'Paul', handle: 'paul' },
  ],
}

/** Family name leads in JP and TW, follows in US and DE. */
const FAMILY_NAME_FIRST: Record<MarketCode, boolean> = { US: false, JP: true, TW: true, DE: false }

/**
 * Names are combined by position, not drawn at random: with 8×8 parts per market and 34
 * customers in each, indexing guarantees every row is a distinct person. A seeded draw
 * would collide often enough to put the same name on two rows of one page, which reads as
 * a data bug in a list whose whole job is to look like real records.
 */
function nameFor(market: MarketCode, ordinal: number): { name: string; handle: string } {
  const family = FAMILY[market][ordinal % FAMILY[market].length]!
  const given = GIVEN[market][Math.floor(ordinal / FAMILY[market].length) % GIVEN[market].length]!

  return {
    name: FAMILY_NAME_FIRST[market]
      ? `${family.text} ${given.text}`
      : `${given.text} ${family.text}`,
    handle: `${given.handle}.${family.handle}`,
  }
}

const SEGMENTS: CustomerSegment[] = ['vip', 'loyal', 'new', 'at-risk']

/** How each segment tends to resolve to a status — weighted by repetition, not by maths. */
const SEGMENT_STATUS: Record<CustomerSegment, CustomerStatus[]> = {
  vip: ['active', 'active', 'active', 'dormant'],
  loyal: ['active', 'active', 'dormant'],
  new: ['active', 'active', 'dormant'],
  'at-risk': ['dormant', 'dormant', 'churned'],
}

const SEGMENT_SPEND_FACTOR: Record<CustomerSegment, number> = {
  vip: 4.2,
  loyal: 2.1,
  new: 0.5,
  'at-risk': 1.1,
}

/** Typical monthly spend per market, in that market's NATIVE currency. */
const BASE_MONTHLY_SPEND: Record<MarketCode, number> = {
  US: 180,
  JP: 21_000,
  TW: 4_200,
  DE: 160,
}

/** How recently each status implies the customer was last seen, in days. */
const STATUS_RECENCY: Record<CustomerStatus, [number, number]> = {
  active: [0, 6],
  dormant: [30, 90],
  churned: [150, 320],
}

/** Spend is aggregated over a year, in monthly buckets. */
const TENURE_MONTHS = 12
const POOL_SIZE = 136

function pick<T>(items: T[], key: string): T {
  return items[Math.floor(seeded(key) * items.length)]!
}

function pickRange(key: string, min: number, max: number): number {
  return Math.round(min + seeded(key) * (max - min))
}

function buildCustomer(index: number, today: Date): Customer {
  const id = `cus_${String(index + 1).padStart(4, '0')}`
  // Round-robin the markets so every one of the four is populated at any pool size.
  const market = MARKETS[index % MARKETS.length]!
  const person = nameFor(market, Math.floor(index / MARKETS.length))
  const segment = pick(SEGMENTS, `cust:seg:${id}`)
  const status = pick(SEGMENT_STATUS[segment], `cust:status:${id}`)

  const nativeCurrency = MARKET_NATIVE_CURRENCY[market]
  const monthly = BASE_MONTHLY_SPEND[market] * SEGMENT_SPEND_FACTOR[segment]

  /**
   * Lifetime value is the SUM OF DAY-CONVERTED amounts, never the native total times one
   * rate — the non-negotiable rule from the API contract, kept honest here by converting
   * each monthly bucket at its own day's official rate before summing. The four currencies
   * that come out are independent totals; the client picks `nativeCurrency` and formats it.
   */
  const buckets = Array.from({ length: TENURE_MONTHS }, (_, month) => {
    const date = isoDate(addDays(today, -(month * 30 + 15)))
    const amount = monthly * (0.7 + seeded(`cust:spend:${id}:${month}`) * 0.6)
    return convertDay(amount, nativeCurrency, date)
  })

  const [minDays, maxDays] = STATUS_RECENCY[status]
  const lastActive = addDays(today, -pickRange(`cust:seen:${id}`, minDays, maxDays))
  // Keep a time-of-day component so relative timestamps read naturally ("4 hours ago").
  lastActive.setUTCHours(
    pickRange(`cust:hour:${id}`, 1, 22),
    pickRange(`cust:min:${id}`, 0, 59),
    0,
    0,
  )

  return {
    id,
    name: person.name,
    email: `${person.handle}@example.com`,
    market,
    segment,
    status,
    lifetimeValue: roundMoney(sumMoney(buckets)),
    nativeCurrency,
    totalOrders: pickRange(`cust:orders:${id}`, 1, Math.round(12 * SEGMENT_SPEND_FACTOR[segment])),
    lastActiveAt: lastActive.toISOString(),
  }
}

/**
 * The pool, memoized per day. Deterministic by contract: the same customer must carry the
 * same figures across requests, or paging through the list would reshuffle under the user.
 * The day is part of the cache key because the seed derives recency from `today`.
 */
let cache: { day: string; customers: Customer[] } | null = null

export function customerPool(today: Date = new Date()): Customer[] {
  const day = isoDate(today)
  if (cache?.day === day) return cache.customers

  const customers = Array.from({ length: POOL_SIZE }, (_, index) => buildCustomer(index, today))
  cache = { day, customers }
  return customers
}

/**
 * Fields this endpoint can sort by, and the raw value each one sorts on.
 *
 * `lifetimeValue` reads the record's NATIVE amount — the number behind the cell. Across
 * mixed markets that makes the sort currency-blind (a JPY total dwarfs a EUR one), which is
 * the documented MVP behaviour: narrow to a single market for a meaningful ranking. There is
 * no cross-currency normalization, and the client must not invent one by re-sorting the
 * formatted strings.
 */
const SORTABLE = {
  name: (c: Customer) => c.name,
  market: (c: Customer) => c.market,
  segment: (c: Customer) => c.segment,
  status: (c: Customer) => c.status,
  totalOrders: (c: Customer) => c.totalOrders,
  lastActiveAt: (c: Customer) => c.lastActiveAt,
  lifetimeValue: (c: Customer) => c.lifetimeValue[c.nativeCurrency],
} satisfies Record<string, (c: Customer) => string | number>

export type CustomerSortField = keyof typeof SORTABLE

export function isCustomerSortField(value: unknown): value is CustomerSortField {
  return typeof value === 'string' && value in SORTABLE
}

export interface CustomerListQuery {
  page: number
  pageSize: number
  sort?: string
  order?: 'asc' | 'desc'
  q?: string
  market?: string
  segment?: string
  status?: string
}

const DEFAULT_SORT: CustomerSortField = 'lastActiveAt'

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  // localeCompare so 佐藤 and Ávila order sensibly rather than by UTF-16 code unit.
  return String(a).localeCompare(String(b))
}

/**
 * Filter → sort → page, in that order. Pure, so the whole list contract is testable in a
 * plain Node environment without booting Nitro.
 */
export function queryCustomers(
  pool: Customer[],
  query: CustomerListQuery,
): { rows: Customer[]; total: number } {
  const term = query.q?.trim().toLowerCase()

  const filtered = pool.filter((customer) => {
    if (query.market && query.market !== 'All' && customer.market !== query.market) return false
    if (query.segment && query.segment !== 'all' && customer.segment !== query.segment) return false
    if (query.status && query.status !== 'all' && customer.status !== query.status) return false
    if (term && !`${customer.name} ${customer.email}`.toLowerCase().includes(term)) return false
    return true
  })

  const field = isCustomerSortField(query.sort) ? query.sort : DEFAULT_SORT
  // Newest-first is the useful default for a recency column; everything else reads ascending.
  const direction = query.order === 'desc' || (!query.order && field === DEFAULT_SORT) ? -1 : 1
  const accessor = SORTABLE[field]

  const sorted = [...filtered].sort(
    (a, b) => compare(accessor(a), accessor(b)) * direction || a.id.localeCompare(b.id),
  )

  const start = (query.page - 1) * query.pageSize
  return { rows: sorted.slice(start, start + query.pageSize), total: sorted.length }
}
