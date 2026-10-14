/**
 * Insight OS — API contract types (single source of truth).
 *
 * Mirrors the `mock-api-contract` skill. Mock endpoints (server/api/) AND Vue Query
 * composables both import from here — no inline/ad-hoc shapes anywhere. When the real
 * backend replaces the Nitro mocks, only the `$api` baseURL and route implementations
 * change; these types stay identical.
 */

/* ─────────────────────────── Envelopes ─────────────────────────── */

export interface ResponseMeta {
  requestId: string
  generatedAt: string // ISO 8601
}

/** Single resource. Never return a bare object. */
export interface ApiResponse<T> {
  data: T
  meta?: ResponseMeta
}

/** Paginated list. Never return a bare array. */
export interface ApiListResponse<T> {
  data: T[]
  pagination: {
    page: number // 1-based
    pageSize: number
    total: number // total rows across all pages
    totalPages: number
  }
  meta?: ResponseMeta
}

/**
 * A feed read newest first whose head keeps growing while the client pages back. Paging by
 * offset would shift under a new item and repeat one; a cursor names where the last page ended.
 */
export interface ApiCursorResponse<T> {
  data: T[]
  /** Opaque: sent back as `cursor` for the next page, never built by the client. `null`: nothing older. */
  nextCursor: string | null
  meta?: ResponseMeta
}

/** Standard error body. Nitro throws it via createError; the `$api` plugin's error
 *  hooks normalize any failure into this shape, and the UI localizes by `code`. */
export interface ApiError {
  error: {
    code: string // machine-readable, e.g. 'UNAUTHORIZED', 'VALIDATION_FAILED'
    message: string // human-readable English; UI maps to i18n by `code`
    details?: unknown // optional field-level info for validation errors
  }
}

/* ─────────────────────────── Core domain ─────────────────────────── */

export type MarketCode = 'US' | 'JP' | 'TW' | 'DE'
export type CurrencyCode = 'USD' | 'JPY' | 'TWD' | 'EUR'
export type Role = 'admin' | 'analyst' | 'viewer'
/** The i18n locale codes. Every request for AI text carries one, and the text arrives in it. */
export type LocaleCode = 'en' | 'zh-TW'

/**
 * A cached AI summary: one analysis of its subject, presented in the requested locale, so every
 * language says the same thing. `generatedAt` is when the analysis ran — the same in each locale.
 */
export interface AiSummary {
  text: string
  generatedAt: string // ISO 8601
}

/**
 * Same amount, independently aggregated in ALL supported currencies using historical
 * daily official rates. Each key is a standalone correct total — they are NOT related
 * by a constant, so the client must never derive one currency from another. The client
 * only picks a key to display and formats it (JPY = 0 decimals).
 */
export type Money = Record<CurrencyCode, number>

/** Audit metadata for how a `Money` map was derived — NOT a reconstructable multiplier. */
export interface FxProvenance {
  method: 'historical-daily-official' // each day converted at that day's rate, then summed
  source: string // rate provider / source of record (e.g. 'ECB', 'internal-fx-eod')
  rangeFrom: string // ISO date — first day covered
  rangeTo: string // ISO date — last day covered
}

/* ─────────────────────────── Auth / session ─────────────────────────── */

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface LoginRequest {
  email: string
  password: string
  /** MVP demo affordance: seeds the session with a role for review. */
  role?: Role
}

export interface LoginResponse {
  token: string
  user: SessionUser
}

/* ─────────────────────────── Organization settings ─────────────────────────── */

/**
 * Organization-level configuration — one value, read by everyone, distinct from any
 * user's session. `presentationCurrency` is the IAS 21 presentation currency
 * (currency-model.md §1); Settings → General is the only surface that writes it.
 */
export interface OrgSettings {
  presentationCurrency: CurrencyCode
}

export type UpdateOrgSettingsRequest = Partial<OrgSettings>

/* ─────────────────────────── Dashboard ─────────────────────────── */

export interface KpiMetric {
  key: 'revenue' | 'orders' | 'conversionRate' | 'activeUsers'
  value: number | Money // Money for monetary metrics (revenue); plain number otherwise
  deltaPct: number // vs. comparison period; negative = down
  sparkline: number[] // mini-chart shape only (scale-invariant → currency-independent)
}

export interface AnomalyAlert {
  id: string // opaque and stable across requests, so a link can name it (`?anomaly=<id>`)
  severity: 'info' | 'warning' | 'critical'
  market: MarketCode
  metricKey: KpiMetric['key']
  message: string // English; UI may localize by code if provided
  detectedAt: string // ISO 8601
}

export interface DashboardSummary {
  date: string // ISO date
  kpis: KpiMetric[] // monetary KPIs carry Money (all 4 currencies)
  alerts: AnomalyAlert[]
  aiSummary: AiSummary
  fx: FxProvenance // how the Money totals in this payload were derived (audit)
}

/* ─────────────────────────── Time series ─────────────────────────── */

export interface TimeSeriesPoint {
  t: string // ISO date
  value: number
}
export interface MarketSeries {
  market: MarketCode
  points: TimeSeriesPoint[]
} // non-monetary: conversion, traffic, …

/** Monetary series carry Money per point: each day already converted at that day's
 *  official rate, so summing points reproduces the historically-accurate total. */
export interface MoneyPoint {
  t: string // ISO date
  value: Money
}
export interface RevenueMarketSeries {
  market: MarketCode
  points: MoneyPoint[]
}

export interface RevenueResponse {
  fx: FxProvenance // audit metadata for the day-by-day conversion (not a rate table)
  series: RevenueMarketSeries[] // each point carries all 4 currencies
  totalsByMarket: { market: MarketCode; total: Money }[] // sum of daily-converted amounts
}

/* ─────────────────────────── Customers ─────────────────────────── */

export type CustomerSegment = 'vip' | 'loyal' | 'new' | 'at-risk'
export type CustomerStatus = 'active' | 'dormant' | 'churned'

export interface Customer {
  id: string
  name: string
  email: string
  market: MarketCode
  segment: CustomerSegment
  status: CustomerStatus
  /** Lifetime value in every currency — each the sum of day-converted amounts. */
  lifetimeValue: Money
  /** Which `lifetimeValue` key to render. Each record displays its market's currency per the spec. */
  functionalCurrency: CurrencyCode
  totalOrders: number
  lastActiveAt: string // ISO 8601
}

/** Codes, never display text: the label and the channel icon are the client's. */
export type JourneyEventType =
  | 'ad_click'
  | 'session'
  | 'livestream_view'
  | 'add_to_cart'
  | 'checkout_abandoned'
  | 'coupon_rejected'
  | 'coupon_redeemed'
  | 'checkout_completed'
  | 'subscription_renewed'
  | 'email_open'
  | 'review'
/** `system`: an event no channel carried, such as a renewal charged on a schedule. */
export type JourneyChannel = 'ads' | 'web' | 'app' | 'livestream' | 'email' | 'system'
/** The coupon engine's code for a rejected coupon. */
export type CouponRejectionCode =
  'minimum_spend_not_met' | 'expired' | 'usage_limit_reached' | 'market_not_eligible'

export interface JourneyEvent {
  id: string
  type: JourneyEventType
  channel: JourneyChannel
  /** The customer's local time, with their offset: '2026-06-24T19:42:00+09:00'. Still an exact instant. */
  occurredAt: string
  /** The IANA zone that offset belongs to, e.g. 'Asia/Tokyo'. Never absent, never the viewer's. */
  timeZone: string
  pageViews?: number // `session` only: its page views, folded into one line
  /*
   * What a source system recorded, never an inference: why the customer acted is the AI
   * summary's to say, from the whole timeline.
   */
  checkoutStep?: 'information' | 'shipping' | 'payment' // `checkout_abandoned` only: the last step reached
  rejectionCode?: CouponRejectionCode // `coupon_rejected` only
  orderIds?: string[] // `checkout_completed` only: the orders it created, each one of the journey's `orders`
}

/**
 * What a list of orders needs to show one, not the full order. Order numbers are unique across
 * shops, so `orderNumber` is the label and needs no shop beside it; `id` is the identity.
 */
export interface OrderSummary {
  id: string
  orderNumber: string
  total: Money
  /** Which `total` key is the record's own currency, rendered by the dual-currency rule. */
  functionalCurrency: CurrencyCode
}

/** Events up to and including one purchase, grouped by the server; the client never regroups. */
export interface CustomerJourney {
  id: string
  /**
   * The purchase that closed it: every order of one shopping decision, split by shop, shipping
   * method or subscription items, or across checkouts the server joined. Never a renewal's order.
   * Empty for the unfinished journey, which only ever leads the first page.
   */
  orders: OrderSummary[]
  /** The orders' total, summed by the server. `null` when `orders` is empty. */
  total: Money | null
  /** The currency every order shares. `null` when they differ, which makes `total` presentation-only. */
  functionalCurrency: CurrencyCode | null
  events: JourneyEvent[] // oldest first; never empty
}

/* ─────────────────────────── AI Assistant ─────────────────────────── */

export interface AiChatRequest {
  message: string
  /**
   * Set when the chat opened from *Ask AI why →*, and sent on every turn: the endpoint keeps no
   * session. The server reads market and range from that anomaly, or else from the question.
   */
  context?: { anomalyId?: string }
  /** The answer's language. Earlier turns in `history` keep the language they were written in. */
  locale: LocaleCode
  /** The conversation so far. The client holds it for the session; the server keeps none. */
  history?: { role: 'user' | 'assistant'; content: string }[]
}

/**
 * A link in an AI answer, named as a target and never as a URL: the client builds it through
 * the route→filters registry, which drops what doesn't match and hides what the role can't open.
 * Strings, not unions — this is model output, checked at runtime. The label is the client's.
 */
export interface AiLinkTarget {
  route: string // a registry pattern, matched exactly — e.g. '/analytics/funnel'
  params?: Record<string, string> // e.g. { market: 'JP', range: '7d' }
}

export interface AiCause {
  rank: number
  title: string
  explanation: string
  confidence: number // 0..1
  links?: AiLinkTarget[] // the evidence for this cause
}

export interface AiChatResponse {
  narrative: string
  chart?: {
    type: 'line' | 'bar' | 'funnel'
    series: MarketSeries[]
    annotations?: { t: string; label: string }[] // e.g. mark the drop
  }
  causes: AiCause[]
  followUps: string[] // suggested question chips
  links?: AiLinkTarget[] // answer-wide; a link backing one cause goes on that cause
}

/* ─────────────────────────── Shared list query params ─────────────────────────── */

export type RangeToken = '7d' | '30d' | '90d' | 'mtd' | 'ytd'

/** Conventions identical across every list endpoint. Display currency is deliberately
 *  NOT here — monetary payloads carry all currencies; the toggle is a client key switch. */
export interface ListQuery {
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
  q?: string
  market?: MarketCode | 'All'
  /**
   * Named filters. An endpoint honours only the ones it documents; the rest are ignored.
   *
   * Each is the domain union it filters on, the way `market` above is: a value outside the
   * union matches no record, so the page comes back empty rather than wrong — a bug with no
   * symptom but a blank table. The wire is still strings; these say which ones mean anything.
   */
  segment?: CustomerSegment
  status?: CustomerStatus
  range?: RangeToken
  from?: string // ISO date (mutually exclusive with `range`)
  to?: string // ISO date
}
