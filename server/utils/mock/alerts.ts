import type { AnomalyAlert, LocaleCode, MarketCode } from '../../../app/types/api'
import { ANOMALY_MARKET, ANOMALY_WINDOW_DAYS, dailyMetrics, isAnomalousDay } from './markets'
import { isoDate, addDays } from './dates'

/**
 * Derives anomaly alerts from the SAME seeded data the charts render, so the alert, the
 * trend line, and the AI Assistant's explanation all describe one coherent story rather
 * than three independently invented numbers.
 */
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
      message: 'TW organic traffic up 12% following the seasonal campaign.',
      detectedAt: new Date(today.getTime() - 1000 * 60 * 320).toISOString(),
    })
  }

  return alerts
}

/*
 * One analysis, written in each locale as translations of each other: a language switch must
 * never change what the summary says. zh-TW sentences join without spaces.
 */
const SUMMARY_SENTENCES = {
  en: {
    anomaly:
      'Japan is the outlier today: conversion has been depressed for a week, and the drop tracks a checkout latency spike rather than a traffic shortfall — sessions are flat while completed orders are not.',
    steady:
      'US and TW are steady against their 30-day baselines, with weekend softness in line with the usual pattern.',
    payments:
      'Germany warrants a look: payment failures are elevated, which is suppressing otherwise healthy order volume.',
  },
  'zh-TW': {
    anomaly:
      '日本是今天的異常市場：轉換率已連續一週偏低，且下滑與結帳延遲飆升同步，而非流量不足——工作階段持平，完成的訂單卻減少。',
    steady: '美國與台灣相對 30 日基準維持穩定，週末略為走弱，與一貫模式相符。',
    payments: '德國值得留意：付款失敗率偏高，壓抑了原本健康的訂單量。',
  },
} satisfies Record<LocaleCode, Record<string, string>>

/** The AI daily summary narrative, in `locale` — leads with the anomaly when it is present. */
export function buildAiSummary(
  markets: MarketCode[],
  locale: LocaleCode,
  today = new Date(),
): string {
  const sentences = SUMMARY_SENTENCES[locale]
  const todayIso = isoDate(today)
  const anomalyActive =
    markets.includes(ANOMALY_MARKET) && isAnomalousDay(ANOMALY_MARKET, todayIso, today)

  const parts: string[] = []
  if (anomalyActive) parts.push(sentences.anomaly)
  parts.push(sentences.steady)
  if (markets.includes('DE')) parts.push(sentences.payments)

  return parts.join(locale === 'zh-TW' ? '' : ' ')
}
