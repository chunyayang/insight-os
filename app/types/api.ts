/**
 * Insight OS — API contract types (single source of truth).
 *
 * Mirrors the `mock-api-contract` skill. Mock endpoints (server/api/) AND Vue Query
 * composables both import from here — no inline/ad-hoc shapes anywhere. When the real
 * backend replaces the Nitro mocks, only the Axios baseURL and route implementations
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

/** Standard error body. Nitro throws it via createError; the Axios interceptor
 *  normalizes any failure into this shape, and the UI localizes by `code`. */
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

/* ─────────────────────────── Dashboard ─────────────────────────── */

export interface KpiMetric {
  key: 'revenue' | 'orders' | 'conversionRate' | 'activeUsers'
  value: number | Money // Money for monetary metrics (revenue); plain number otherwise
  deltaPct: number // vs. comparison period; negative = down
  sparkline: number[] // mini-chart shape only (scale-invariant → currency-independent)
}

export interface AnomalyAlert {
  id: string
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

/* ─────────────────────────── AI Assistant ─────────────────────────── */

export interface AiChatRequest {
  message: string
  context?: { market?: MarketCode; range?: string }
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface AiCause {
  rank: number
  title: string
  explanation: string
  confidence: number // 0..1
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
  range?: RangeToken
  from?: string // ISO date (mutually exclusive with `range`)
  to?: string // ISO date
}
