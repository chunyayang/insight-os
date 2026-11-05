import type { AnomalyAlert, LocaleCode, MarketCode } from '../../../app/types/api'
import {
  ANOMALY_MARKET,
  ANOMALY_WINDOW_DAYS,
  conversionOn,
  dailyMetrics,
  isAnomalousDay,
  pctChange,
  revenueOn,
} from './markets'
import { isoDate, addDays } from './dates'

/**
 * Derives anomaly alerts from the SAME seeded data the charts render, so the alert, the
 * trend line, and the AI Assistant's explanation all describe one coherent story rather
 * than three independently invented numbers.
 */
/** TW's active users, today against yesterday, as a whole percent. */
function twUsersUpPct(today: Date): number {
  const users = (date: Date) => dailyMetrics('TW', isoDate(date), today).activeUsers
  return Math.round(pctChange(users(today), users(addDays(today, -1))) * 100)
}

export function buildAlerts(markets: MarketCode[], today = new Date()): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = []

  if (markets.includes(ANOMALY_MARKET)) {
    /*
     * Compare the anomaly WINDOW AVERAGE against the preceding week's average.
     * Sampling two single days would mix in per-day jitter and weekend seasonality and
     * report a drop that doesn't match the seeded anomaly — averaging both windows
     * cancels that noise, so the headline figure agrees with the trend line users see.
     */
    const meanConversion = (offset: number) => {
      const values = Array.from(
        { length: ANOMALY_WINDOW_DAYS },
        (_, i) =>
          dailyMetrics(ANOMALY_MARKET, isoDate(addDays(today, -(offset + i))), today)
            .conversionRate,
      )
      return values.reduce((total, v) => total + v, 0) / values.length
    }

    const during = meanConversion(0)
    const before = meanConversion(ANOMALY_WINDOW_DAYS)
    const dropPct = Math.round(((before - during) / before) * 100)

    alerts.push({
      id: 'anom_cl290f8aj0001',
      severity: 'critical',
      market: ANOMALY_MARKET,
      metricKey: 'conversionRate',
      message: `JP conversion rate down ${dropPct}% vs the 7-day average.`,
      detectedAt: new Date(today.getTime() - 1000 * 60 * 42).toISOString(),
    })
  }

  if (markets.includes('DE')) {
    alerts.push({
      id: 'anom_cl291k3qm0007',
      severity: 'warning',
      market: 'DE',
      metricKey: 'orders',
      message: 'DE payment failures trending above normal for 3 hours.',
      detectedAt: new Date(today.getTime() - 1000 * 60 * 175).toISOString(),
    })
  }

  if (markets.includes('TW')) {
    alerts.push({
      id: 'anom_cl292w5tz0004',
      severity: 'info',
      market: 'TW',
      metricKey: 'activeUsers',
      message: `TW active users up ${twUsersUpPct(today)}% vs yesterday following the seasonal campaign.`,
      detectedAt: new Date(today.getTime() - 1000 * 60 * 320).toISOString(),
    })
  }

  return alerts
}

/*
 * One analysis, written in each locale as translations of each other: a language switch must
 * never change what the summary says. zh-TW sentences join without spaces. A percentage is
 * computed the way its KPI card computes it, so the two always read the same.
 */
const SUMMARY_SENTENCES = {
  en: {
    up: (pct: string) => `up ${pct}`,
    down: (pct: string) => `down ${pct}`,
    flat: 'flat',
    headline: (revenue: string, conversion: string) =>
      `Revenue is ${revenue} vs yesterday and conversion is ${conversion}.`,
    usDemand: 'US demand is the main driver, with orders and active users both up.',
    twCampaign: (pct: number) =>
      `Taiwan's seasonal campaign lifted active users ${pct}% vs yesterday.`,
    anomaly:
      'Japan is the outlier: conversion has been depressed for a week, and the drop tracks a checkout latency spike rather than a traffic shortfall — active users are holding while completed orders fall.',
    payments:
      'Germany warrants a look: payment failures are elevated, holding orders below yesterday.',
  },
  'zh-TW': {
    up: (pct: string) => `上升 ${pct}`,
    down: (pct: string) => `下降 ${pct}`,
    flat: '持平',
    headline: (revenue: string, conversion: string) =>
      `營收較昨日${revenue}，轉換率${conversion}。`,
    usDemand: '美國需求是主要動力，訂單與活躍用戶皆上升。',
    twCampaign: (pct: number) => `台灣的季節性活動使活躍用戶較昨日增加 ${pct}%。`,
    anomaly:
      '日本是異常市場：轉換率已連續一週偏低，且下滑與結帳延遲飆升同步，而非流量不足——活躍用戶持穩，完成的訂單卻減少。',
    payments: '德國值得留意：付款失敗率偏高，使訂單低於昨日。',
  },
}

const ONE_DECIMAL_PERCENT = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** The AI daily summary narrative, in `locale`: the day's movement, then each market's part in it. */
export function buildAiSummary(
  markets: MarketCode[],
  locale: LocaleCode,
  today = new Date(),
): string {
  const sentences = SUMMARY_SENTENCES[locale]
  const todayIso = isoDate(today)
  const yesterdayIso = isoDate(addDays(today, -1))

  // One decimal of a percent, rounded as the card rounds it; what would read 0.0% is flat.
  const movement = (change: number) => {
    const pct = ONE_DECIMAL_PERCENT.format(Math.abs(change))
    if (pct === '0.0%') return sentences.flat
    return change > 0 ? sentences.up(pct) : sentences.down(pct)
  }
  const revenue = pctChange(
    revenueOn(markets, todayIso, today).USD,
    revenueOn(markets, yesterdayIso, today).USD,
  )
  const conversion = pctChange(
    conversionOn(markets, todayIso, today),
    conversionOn(markets, yesterdayIso, today),
  )

  const parts: string[] = [sentences.headline(movement(revenue), movement(conversion))]
  if (markets.includes('US')) parts.push(sentences.usDemand)
  if (markets.includes('TW')) parts.push(sentences.twCampaign(twUsersUpPct(today)))
  if (markets.includes(ANOMALY_MARKET) && isAnomalousDay(ANOMALY_MARKET, todayIso, today)) {
    parts.push(sentences.anomaly)
  }
  if (markets.includes('DE')) parts.push(sentences.payments)

  return parts.join(locale === 'zh-TW' ? '' : ' ')
}
