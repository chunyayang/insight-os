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
  id: string // stable across requests, so a link can name it (`?anomaly=<id>`)
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
  aiSummary: { text: string; generatedAt: string }
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

/* ─────────────────────────── AI Assistant ─────────────────────────── */

export interface AiChatRequest {
  message: string
  /**
   * What the conversation is about when it started from a handoff. There is no market or
   * range: the AI page has no control for either, so the server reads them from the anomaly
   * record, or from the question itself. Sent on every turn of that conversation.
   */
  context?: { anomalyId?: string }
  history?: { role: 'user' | 'assistant'; content: string }[]
}

/**
 * Where a link in an AI answer goes — never a URL. `route` is matched exactly against the
 * route→filters registry's patterns and `params` against what that route accepts; whatever
 * fails is dropped, and a route the role can't open is not shown. Plain strings on purpose:
 * the values come from model output, so the registry checks them at runtime and a union
 * here would promise what the wire can't keep. The label is the client's, by target route.
 */
export interface AiLinkTarget {
  route: string // registry route pattern, e.g. '/analytics/funnel'
  params?: Record<string, string> // the target page's URL params, e.g. { market: 'JP', range: '7d' }
}

export interface AiCause {
  rank: number
  title: string
  explanation: string
  confidence: number // 0..1
  links?: AiLinkTarget[] // where the evidence for this cause is
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
  links?: AiLinkTarget[] // for the answer as a whole; a cause's own go on the cause
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
