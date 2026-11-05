import type { MarketCode, Money } from '../../../app/types/api'
import { convertDay, MARKET_FUNCTIONAL_CURRENCY, roundMoney, sumMoney } from './fx'
import { seededRange } from './seed'
import { isoDate, addDays } from './dates'

export const MARKETS: MarketCode[] = ['US', 'JP', 'TW', 'DE']

/** Typical daily volumes per market, expressed in that market's FUNCTIONAL currency. */
const BASELINE: Record<
  MarketCode,
  { revenue: number; orders: number; conv: number; users: number }
> = {
  US: { revenue: 85_000, orders: 1_200, conv: 0.031, users: 24_000 },
  JP: { revenue: 9_800_000, orders: 900, conv: 0.028, users: 18_000 },
  TW: { revenue: 1_450_000, orders: 640, conv: 0.024, users: 11_000 },
  DE: { revenue: 52_000, orders: 700, conv: 0.026, users: 14_000 },
}

/**
 * The deliberate JP anomaly: conversion (and with it revenue) falls ~18% over the trailing
 * week. The Dashboard surfaces this as a critical alert whose "Ask AI why →" deep-links
 * into the AI Assistant's worked example, so the whole hero narrative hangs off this seed.
 */
export const ANOMALY_MARKET: MarketCode = 'JP'
export const ANOMALY_WINDOW_DAYS = 7
const ANOMALY_FACTOR = 0.82 // -18%

export function isAnomalousDay(market: MarketCode, date: string, today = new Date()): boolean {
  if (market !== ANOMALY_MARKET) return false
  const windowStart = isoDate(addDays(today, -(ANOMALY_WINDOW_DAYS - 1)))
  return date >= windowStart && date <= isoDate(today)
}

type MetricKey = 'revenue' | 'orders' | 'conv' | 'users'

/**
 * Today as a multiple of yesterday. The Dashboard reads today against yesterday, so this table
 * decides which way each KPI card points on any date, and the alerts and AI summary quote the
 * results. Orders follow users x conversion, so a market's metrics agree with each other.
 */
const TODAY_VS_YESTERDAY: Record<MarketCode, Record<MetricKey, number>> = {
  US: { revenue: 1.12, orders: 1.067, conv: 0.97, users: 1.1 },
  JP: { revenue: 0.92, orders: 0.91, conv: 0.9, users: 1.01 },
  TW: { revenue: 1.18, orders: 1.17, conv: 0.96, users: 1.22 },
  DE: { revenue: 0.98, orders: 0.97, conv: 0.94, users: 1.03 },
}

/** Weekends run lighter than weekdays — keeps trend lines believable. */
function seasonality(date: string): number {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay()
  return dow === 0 || dow === 6 ? 0.82 : 1
}

function metricFactor(market: MarketCode, metric: MetricKey, date: string, today: Date): number {
  const todayIso = isoDate(today)
  const yesterdayIso = isoDate(addDays(today, -1))
  const isLatest = date === todayIso

  // Yesterday takes today's day-of-week level: a weekend edge between them would swamp the table.
  const seasonDate = isLatest || date === yesterdayIso ? todayIso : date
  const jitterDate = isLatest ? yesterdayIso : date

  // A rate does not soften at the weekend the way volumes do.
  const season = metric === 'conv' ? 1 : seasonality(seasonDate)
  const jitter = seededRange(`m:${market}:${metric}:${jitterDate}`, 0.92, 1.08)
  return season * jitter * (isLatest ? TODAY_VS_YESTERDAY[market][metric] : 1)
}

export interface DailyMetrics {
  date: string
  market: MarketCode
  /** In the market's functional currency — convert per-day before aggregating. */
  revenueNative: number
  orders: number
  conversionRate: number
  activeUsers: number
}

export function dailyMetrics(market: MarketCode, date: string, today = new Date()): DailyMetrics {
  const base = BASELINE[market]
  const factor = (metric: MetricKey) => metricFactor(market, metric, date, today)
  const anomaly = isAnomalousDay(market, date, today) ? ANOMALY_FACTOR : 1

  return {
    date,
    market,
    revenueNative: Math.round(base.revenue * factor('revenue') * anomaly),
    orders: Math.round(base.orders * factor('orders') * anomaly),
    conversionRate: Number((base.conv * factor('conv') * anomaly).toFixed(5)),
    activeUsers: Math.round(base.users * factor('users')),
  }
}

/** One day's revenue for a market, converted at THAT day's rates into all four currencies. */
export function dailyRevenueMoney(market: MarketCode, date: string, today = new Date()): Money {
  const { revenueNative } = dailyMetrics(market, date, today)
  return roundMoney(convertDay(revenueNative, MARKET_FUNCTIONAL_CURRENCY[market], date))
}

/** Revenue across markets on one day: the sum of each market's daily-converted amounts. */
export function revenueOn(markets: MarketCode[], date: string, today = new Date()): Money {
  return roundMoney(sumMoney(markets.map((m) => dailyRevenueMoney(m, date, today))))
}

/** Conversion across markets on one day: an average of the markets' rates, not a sum. */
export function conversionOn(markets: MarketCode[], date: string, today = new Date()): number {
  const total = markets.reduce((t, m) => t + dailyMetrics(m, date, today).conversionRate, 0)
  return total / markets.length
}

/** Change as a ratio, rounded so the cards and the summary quote one figure. */
export function pctChange(current: number, previous: number): number {
  return previous === 0 ? 0 : Number(((current - previous) / previous).toFixed(4))
}
