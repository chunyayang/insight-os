import type { AnomalyAlert, MarketCode } from '../../../app/types/api'
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
      id: 'alert-jp-conversion',
      severity: 'critical',
      market: ANOMALY_MARKET,
      metricKey: 'conversionRate',
      message: `JP conversion rate down ${dropPct}% vs the 7-day average.`,
      detectedAt: new Date(today.getTime() - 1000 * 60 * 42).toISOString(),
    })
  }

  if (markets.includes('DE')) {
    alerts.push({
      id: 'alert-de-payments',
      severity: 'warning',
      market: 'DE',
      metricKey: 'orders',
      message: 'DE payment failures trending above normal for 3 hours.',
      detectedAt: new Date(today.getTime() - 1000 * 60 * 175).toISOString(),
    })
  }

  if (markets.includes('TW')) {
    alerts.push({
      id: 'alert-tw-traffic',
      severity: 'info',
      market: 'TW',
      metricKey: 'activeUsers',
      message: 'TW organic traffic up 12% following the seasonal campaign.',
      detectedAt: new Date(today.getTime() - 1000 * 60 * 320).toISOString(),
    })
  }

  return alerts
}

/** The AI daily summary narrative — leads with the anomaly when it is present. */
export function buildAiSummary(markets: MarketCode[], today = new Date()): string {
  const todayIso = isoDate(today)
  const anomalyActive =
    markets.includes(ANOMALY_MARKET) && isAnomalousDay(ANOMALY_MARKET, todayIso, today)

  const parts: string[] = []

  if (anomalyActive) {
    parts.push(
      'Japan is the outlier today: conversion has been depressed for a week, and the drop tracks a checkout latency spike rather than a traffic shortfall — sessions are flat while completed orders are not.',
    )
  }

  parts.push(
    'US and TW are steady against their 30-day baselines, with weekend softness in line with the usual pattern.',
  )

  if (markets.includes('DE')) {
    parts.push(
      'Germany warrants a look: payment failures are elevated, which is suppressing otherwise healthy order volume.',
    )
  }

  return parts.join(' ')
}
