# Replace Chart.js with Apache ECharts

> **Status:** In progress — PR 1 open. Sequencing gate satisfied: PR 7 of the PrimeVue → Nuxt UI
> migration ([`nuxt-ui-migration.md`](nuxt-ui-migration.md)) landed 2026-09 (`chore/drop-primevue`).
> This document is now the reference for implementation and carries its own PR sequence below.

## Decision

Move from Chart.js to Apache ECharts via `vue-echarts` 8 — not the `nuxt-echarts` module.

## Why

The product spec requires four visuals Chart.js cannot draw natively: conversion funnel (§4.3.3),
retention cohort heatmap (§4.3.4), billing gauges (§4.10.4), and inline AI point annotations
(§4.4.1). `AiChatResponse.chart` in `app/types/api.ts` already types `'funnel'`, which has no
Chart.js equivalent. Staying would put third-party Chart.js plugins for all four on the critical
path of both hero modules (Analytics, AI Assistant) — the same unmaintained-dependency exposure
that disqualified PrimeVue. A Vue `readonly`-proxy warning surfaced the discussion but is not the
justification: that bug was dev-only and is already fixed.

## Consequence

Do not start the Analytics or AI Assistant modules' charts on Chart.js — they're exactly the
charts that force the switch. Existing Dashboard charts (`useChartTheme()`, `MARKET_COLOR`,
`CHART_CHROME`) stay as documented in `/stack-conventions` § Charts until PR 1 below replaces them.

`MARKET_COLOR`/`CHART_CHROME` themselves are **not** being replaced by CSS custom properties —
checked against `zrender`'s color parser (hex/`rgb()`/`hsl()`/named-table only, no `oklch()` or
`var()` resolution), the same narrow grammar that forced them to be hex under Chart.js. What
changes is `useChartTheme()`'s *shape* (ECharts' option vocabulary instead of Chart.js's
`scales`/`plugins`) and the *reasoning in its comments* (zrender's own color math — hover shading,
`areaStyle` opacity, `visualMap` gradients — needs a literal string; it isn't a Chart.js-specific
limitation). See the Approach section below.

## Approach

Chart.js's footprint here is small — one wrapper (`BaseChart.vue`), two consumers
(`TrendLineChart.vue`, `Sparkline.vue`), one plugin, one composable, one constants file — unlike
the 28-site PrimeVue migration this was queued behind. That changes the shape of the sequence:
there's no value in a multi-PR coexistence period for the *existing* charts, since the wrapper and
its two consumers must change together to stay green — splitting them would leave `main` red
between merges. PR 1 is deliberately one atomic swap for that reason.

What does split out on its own timeline is the four net-new chart types the product spec needs
(funnel, retention heatmap, billing gauge, AI point annotation). None of their consuming surfaces
exist yet — Analytics and AI Assistant are still unbuilt stubs, and Settings only has the General
tab. Building a chart component ahead of a real page to mount it in is exactly what
`/stack-conventions` and this repo's own precedent (PR 7 was gated on real consumers existing) say
not to do. So PRs 3–6 are **gated, not scheduled** — each names its data contract and component
shape now (cheap, low-risk, and `AiChatResponse.chart.type` already commits to `'funnel'`), but is
marked "do not open until `<module>`'s build begins." Their relative order follows `spec.md`'s own
Hero Flow list (AI Assistant, then Analytics; Billing isn't a hero flow), not a committed roadmap —
flagged again in Open items.

## PR sequence

### PR 0 — `docs/echarts-migration-plan`
This document: commit this Approach/PR-sequence/Verification/Open-items content, flip Status to
"in progress," and fix the §4.2.3/§4.2.4 → §4.3.3/§4.3.4 citations above (§4.2 is Dashboard, §4.3
is Analytics — the gauge and annotation citations were already correct). Out of scope for this
repo: `spec.md` (in the separate `insight-os-doc` repo, line ~121) names "Chart.js" in a
functional-requirements line, off-charter independent of this migration since the spec states
requirements, not implementation choices — worth a one-line fix over there.

### PR 1 — `chore/echarts-core-migration` (highest-risk PR)
The atomic swap:
- `package.json`: remove `chart.js`; add `echarts` (`^6.x`) + `vue-echarts` (`^8.x`) — peer ranges
  satisfied on paper against `vue@3.5.42`, not yet hands-on verified.
- Delete `app/plugins/chartjs.client.ts`; add `app/plugins/echarts.client.ts` — same client-only,
  register-once shape, tree-shaken (`echarts/core` + explicit `use()` of only `CanvasRenderer`,
  `LineChart`, `GridComponent`, `TooltipComponent`, `LegendComponent`). Each later PR adds to this
  one `use()` call rather than opening a second registration point.
- Rewrite `app/components/charts/BaseChart.vue` to wrap `vue-echarts`'s `VChart`
  (`<v-chart :option="option" autoresize />`). Keep the `<figure>` + hidden `<figcaption>`
  accessibility pattern verbatim. Props become `option: EChartsOption` + `summary` + `height`
  (drop `type`; ECharts encodes type per-series). Carry the `toPlainData()` readonly-proxy guard
  forward provisionally — confirm in manual QA whether zrender actually needs it.
- Rewrite `app/composables/useChartTheme.ts`: same exported surface (`theme`, `colorForMarket`,
  `colorAt`), same `computed`-off-`isDark` derivation, reshaped to ECharts' option vocabulary, with
  corrected doc comments per the Why/Approach sections above. Drop `withAlpha()` if PR 1's grep
  confirms its one call site (`TrendLineChart.vue`) is gone — ECharts' `areaStyle: { color, opacity }`
  takes flat color + separate opacity, no pre-blended rgba needed.
- `app/constants/markets.ts`: `MARKET_COLOR` hex values unchanged; only the docblock's rationale
  corrected the same way. Keep resolving market color explicitly per series (`colorForMarket()`),
  never via ECharts' `theme.color` array — it cycles by series index exactly like the Chart.js
  `Colors` plugin this repo already deliberately avoids.
- Rewrite `TrendLineChart.vue` and `Sparkline.vue` to build `EChartsOption` instead of
  `ChartConfiguration`. Props/interfaces stay unchanged — `RevenueTrend.vue` and `KpiCard.vue` need
  zero changes.
- `test/nuxt/RevenueTrend.test.ts` and the KpiCard test: add `global: { stubs: { VChart: true } }` —
  necessary, not optional: `happy-dom`'s `canvas.getContext('2d')` returns `null` in this repo
  today. Chart.js tolerates that silently, which is why chart tests pass with no real canvas;
  zrender's behavior under a null context is unverified, so don't rely on it.
- `test/unit/chart-color.test.ts`: drop `withAlpha`-specific cases if the helper is removed; keep
  the hex-format/distinct-per-theme cases.
- Merge `animation: false` into every chart's `option` for `prefers-reduced-motion` — new code, not
  a straight port: Chart.js had one global `Chart.defaults.animation = false`, ECharts has no
  equivalent global default.

### PR 2 — `docs/echarts-conventions`
- `.claude/skills/stack-conventions/SKILL.md` Charts section: drop the "migration decided, not
  started" blockquote; rewrite the Chart.js-specific rules as their ECharts-true equivalents — the
  rules mostly survive verbatim, only the library name and the "why hex" sentence change.
- `.claude/CLAUDE.md`: stack line `Chart.js` → `Apache ECharts (vue-echarts)`; correct the
  "can't consume oklch()" line.
- Append a "What shipped" section to this doc once PR 1 + 2 land.

### PRs 3–6 — net-new chart types (gated, not scheduled)

- **PR 3 `feature/ai-point-annotations`** (gate: AI Assistant Chat build) — §4.4.1. Extend
  `TrendLineChart.vue` (or a thin sibling) with `annotations?: {t,label}[]` → ECharts `markPoint`.
  Add `MarkPointComponent` to the plugin's `use()` list. `AiChatResponse.chart.annotations`
  already matches this shape — no type change needed for this PR specifically.
- **PR 4 `feature/analytics-funnel-chart`** (gate: Analytics → Conversion Funnel tab) — §4.3.3. New
  `FunnelStage`/`FunnelSeries`/`FunnelResponse` types; new `FunnelChart.vue` using ECharts
  `series.funnel`, one per market, colored via `colorForMarket()`. Add `FunnelChart` to `use()`.
- **PR 5 `feature/analytics-retention-heatmap`** (gate: Analytics → User Retention tab) — §4.3.4.
  New `CohortRetentionCell`/`CohortRetentionResponse` types; new `RetentionHeatmap.vue` using
  ECharts `series.heatmap` + `visualMap`. Add `HeatmapChart` + `VisualMapComponent` to `use()`.
  Needs a new theming primitive — `useChartTheme()` gains a *sequential* palette (low→high), since
  the existing categorical per-market palette doesn't fit a heatmap.
- **PR 6 `feature/billing-usage-gauge`** (gate: Settings → Billing tab; lowest priority — not a
  hero flow) — §4.10.4. New `UsageGauge`/`BillingUsageResponse` types; new `UsageGauge.vue` using
  ECharts `series.gauge`. Gated in the page on `can('settings:admin')` —
  `DENIED_TREATMENT['settings:admin'] = 'hidden'` in `app/constants/permissions.ts`, so the tab is
  absent for non-Admins, not disabled.

## Verification

Every PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

PR 1 manual QA, risk-ordered:
1. Confirm tests pass with the `VChart` stub; as a one-time spike, remove it locally to observe the
   actual failure mode (don't leave it removed).
2. Real-browser check on Dashboard (switch market tabs / presentation currency repeatedly) for the
   `"Set operation on key … failed: target is readonly"` warning — confirms whether `toPlainData()`'s
   guard is still load-bearing.
3. Dark-mode cookie + hard reload: chart colors correct on first paint, no post-hydration flip.
4. Market color identity stable across series-count changes (JP stays the same color whether one or
   all four markets are shown).
5. `prefers-reduced-motion` actually disables animation.
6. Bundle size: diff `.output/public` before/after; `grep -rn "from 'echarts'"` in `app/` should
   return nothing (only `echarts/core`, `echarts/renderers`, `echarts/charts`, `echarts/components`
   imports).
7. Accessibility: `vue-echarts`'s rendered DOM subtree doesn't introduce ARIA roles that fight the
   `<figure>`/hidden-`<figcaption>` pattern.
8. `pnpm test:e2e` still green; update `test/e2e/smoke.test.ts`'s Chart.js comment once PR 2 lands.

## Open items (flagging, not fixing)

- `SVGRenderer` is a real, unexplored alternative that would let *flat* fills reference `--ui-*`
  directly (SVG participates in the CSS cascade) — not adopted here, since every planned chart type
  uses at least one zrender-internal color computation that the renderer choice doesn't route
  around. Worth a standalone spike if hex-constant maintenance ever becomes a real cost.
- `AiChatResponse.chart`'s union doesn't actually discriminate: `type: 'line'|'bar'|'funnel'` but
  `series: MarketSeries[]` is fixed regardless of type, and `MarketSeries.points` has no field for a
  funnel stage name. Doesn't block PRs 3–6 as scoped (PR 4 defines a separate `FunnelResponse` type
  for the Analytics tab), but blocks an AI-generated funnel chart specifically, and predates this
  migration.
- PRs 3–6's relative order is inferred from `spec.md`'s Hero Flow list, not a committed roadmap
  (none exists as of this writing) — revisit when a module's build is actually scheduled.
- `vue-echarts`/`echarts` version compatibility with Vue 3.5.42 / Nuxt 4 is verified on paper
  (registry peer ranges) only, not hands-on — first real check is PR 1's manual QA.
- CSP: `vue-echarts` injects CSS globally by default; only needs an explicit style import under a
  strict CSP or Shadow DOM. Neither applies today — note in case Vercel headers ever add a CSP.
