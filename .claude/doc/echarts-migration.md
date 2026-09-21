# Replace Chart.js with Apache ECharts

> **Status:** Decided 2026-07-31 — queued, not started. Sequenced **after PR 7** of the
> PrimeVue → Nuxt UI migration ([`nuxt-ui-migration.md`](nuxt-ui-migration.md)); the repo still
> runs Chart.js until then. This document becomes the reference once implementation starts and
> gets a PR sequence of its own.

## Decision

Move from Chart.js to Apache ECharts via `vue-echarts` 8 — not the `nuxt-echarts` module.

## Why

The product spec requires four visuals Chart.js cannot draw natively: conversion funnel (§4.2.3),
retention cohort heatmap (§4.2.4), billing gauges (§4.10.4), and inline AI point annotations
(§4.4.1). `AiChatResponse.chart` in `app/types/api.ts` already types `'funnel'`, which has no
Chart.js equivalent. Staying would put third-party Chart.js plugins for all four on the critical
path of both hero modules (Analytics, AI Assistant) — the same unmaintained-dependency exposure
that disqualified PrimeVue. A Vue `readonly`-proxy warning surfaced the discussion but is not the
justification: that bug was dev-only and is already fixed.

## Consequence

Do not start the Analytics or AI Assistant modules' charts on Chart.js — they're exactly the
charts that force the switch. If either module comes up before PR 7 lands, raise the sequencing
question rather than building new Chart.js charts there. Existing Dashboard charts (`useChartTheme()`,
`MARKET_COLOR`, `CHART_CHROME`) stay as documented in `/stack-conventions` § Charts until this
migration's own PR sequence replaces them.
