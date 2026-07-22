import type { MarketCode, Money } from '../../../app/types/api'
import { convertDay, MARKET_NATIVE_CURRENCY, roundMoney } from './fx'
import { seededRange } from './seed'
import { isoDate, addDays } from './dates'

export const MARKETS: MarketCode[] = ['US', 'JP', 'TW', 'DE']

/** Typical daily volumes per market, expressed in that market's NATIVE currency. */
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

/** Weekends run lighter than weekdays — keeps trend lines believable. */
function seasonality(date: string): number {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay()
  return dow === 0 || dow === 6 ? 0.82 : 1
}

export interface DailyMetrics {
  date: string
  market: MarketCode
  /** In the market's native currency — convert per-day before aggregating. */
  revenueNative: number
  orders: number
  conversionRate: number
  activeUsers: number
}

export function dailyMetrics(market: MarketCode, date: string, today = new Date()): DailyMetrics {
  const base = BASELINE[market]
  const jitter = seededRange(`m:${market}:${date}`, 0.92, 1.08)
  const factor = seasonality(date) * jitter
  const anomaly = isAnomalousDay(market, date, today) ? ANOMALY_FACTOR : 1

  return {
    date,
    market,
    revenueNative: Math.round(base.revenue * factor * anomaly),
    orders: Math.round(base.orders * factor * anomaly),
    conversionRate: Number((base.conv * factor * anomaly).toFixed(5)),
    activeUsers: Math.round(base.users * factor),
  }
}

/** One day's revenue for a market, converted at THAT day's rates into all four currencies. */
export function dailyRevenueMoney(market: MarketCode, date: string, today = new Date()): Money {
  const { revenueNative } = dailyMetrics(market, date, today)
  return roundMoney(convertDay(revenueNative, MARKET_NATIVE_CURRENCY[market], date))
}
