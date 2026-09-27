# Replace Chart.js with Apache ECharts

> **Status:** PR 1 and PR 2 merged (`chore(charts): replace Chart.js with ECharts (#86)`). PR 3
> (renderer spike) ran, closed with `CanvasRenderer` kept — see its section below for the measured
> numbers. PRs 4–7 remain gated on their consuming module's build, per the Approach section. See
> "What shipped" at the end of this document for where PR 1 departed from the plan below.

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
not to do. So PRs 4–7 are **gated, not scheduled** — each names its data contract and component
shape now (cheap, low-risk, and `AiChatResponse.chart.type` already commits to `'funnel'`), but is
marked "do not open until `<module>`'s build begins." Their relative order follows `spec.md`'s own
Hero Flow list (AI Assistant, then Analytics; Billing isn't a hero flow), not a committed roadmap —
flagged again in Open items.

PR 3, the renderer spike, is the one scheduled PR after the swap. It needs no new surface, and it
runs before any gated PR so the new chart types are built on the renderer we keep rather than
ported onto it afterwards.

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

### PR 2 — `docs/echarts-conventions` — shipped
- `.claude/skills/stack-conventions/SKILL.md` Charts section: dropped the "migration decided, not
  started" blockquote; rewrote the Chart.js-specific rules as their ECharts-true equivalents.
  Registration is documented as living in `app/utils/echarts.ts` (a side-effect module
  `BaseChart.vue` imports), not a client-side plugin, so ECharts ships only in the chunks of
  routes that render a chart.
- `.claude/CLAUDE.md`: stack line `Chart.js` → `Apache ECharts (vue-echarts)`; corrected the
  "can't consume oklch()" line to name zrender, not Chart.js, as the parser doing the rejecting.
- Retired the PrimeVue / `tokens.css` comments left over from the Nuxt UI migration
  (`useTheme.ts`, `useNotify.ts`, `app.config.ts`, `AnomalyAlerts.vue`, `login.vue`) — each either
  stated something no longer true or narrated history, which `/stack-conventions` § Comments rules
  out. Restated the constraint where one survived; dropped the comment where none did.
- `test/e2e/smoke.test.ts:7`: "Chart.js" → "ECharts" in the stack list.
- `.claude/skills/testing-and-ci/SKILL.md`: dropped the stale `withAlpha()`/"Chart.js can't parse
  oklch()" line in the testing-priorities list (`withAlpha()` no longer exists post–PR 1) in favor
  of naming zrender's color parser directly.
- PR 4 below said "the plugin's `use()` list", and PRs 5–6 said "add to `use()`" — all three now
  point at `app/utils/echarts.ts` explicitly (see below).

### PR 3 — `chore/echarts-svg-renderer` — spiked and closed, kept `CanvasRenderer`

Spiked `SVGRenderer` against `CanvasRenderer` on the current build (5 Dashboard charts: 1 trend +
4 sparklines). Numbers didn't clear the bar the Why section below expected, so the PR is closed
without merging the swap — recorded here so the question isn't re-spiked without new evidence
(e.g., a materially denser chart type landing in PRs 4–7).

- **Why SVG looked like a candidate.** Every chart here is small. The densest planned chart is the
  Dashboard trend: 4 series × at most 366 daily points (YTD), with symbols off. The Dashboard's
  four KPI sparklines hold about 30 points each, and the weekly retention cohort grid (§4.3.4) has
  a few hundred cells at most. ECharts' own guidance is Canvas for thousands of elements or heavy
  effects, and SVG for many small instances, mobile and low memory. Each canvas also holds a
  backing bitmap at `devicePixelRatio`, so a bigger a-priori concern than the point counts alone.
- **The swap (spiked, then reverted).** `SVGRenderer` in `app/utils/echarts.ts` in place of
  `CanvasRenderer`, plus `init-options: { renderer: 'svg' }` from `BaseChart.vue`. Both renderers
  need registering only one at a time — confirmed no runtime error either way.
- **Measured, on the prod build (`pnpm build` + `node .output/server/index.mjs`), Playwright +
  CDP, headless Chromium, `devicePixelRatio: 1`:**
  1. **Bundle (gzip):** Canvas 183,898 B → SVG 187,489 B — **+3,591 B (+2.0%), SVG is bigger.**
     Registering `SVGRenderer` doesn't tree-shake smaller than `CanvasRenderer`; it's simply an
     addition to zrender's surface, not a substitute with less code.
  2. **Dashboard memory, all 5 charts mounted, JS heap (`Performance.getMetrics` /
     `JSHeapUsedSize`) after forced GC:** Canvas 11.3 MB → SVG 11.4 MB — flat, no measurable
     difference. Important caveat: this metric is V8 heap only. It does **not** include a
     canvas's backing bitmap, which lives in GPU/compositor memory outside the JS heap — so this
     measurement cannot see the specific cost the Why section was worried about. Computed
     analytically instead (actual rendered sizes: 4 sparklines at 273×40, 1 trend at 934×288):
     at this repo's headless-test `devicePixelRatio: 1`, Canvas's backing bitmaps total **~1.2 MB**
     across all 5 charts; at `devicePixelRatio: 2` (a real retina display) that's **~5 MB**, in the
     range the Why section estimated. SVG's equivalent cost is a few hundred DOM nodes (940 SVG
     nodes measured vs. 827 total DOM nodes on the Canvas build), not a scaling bitmap. So there
     is a real, DPR-dependent Canvas cost SVG avoids — it just isn't visible in a JS-heap
     comparison, and a few MB is small next to the bundle-size and (see below) parity picture.
  3. **Frame time, tooltip hover across the trend chart at 4× CPU throttle (20 samples):** Canvas
     avg 33.7 ms / max 39 ms; SVG avg 34.3 ms / max 49 ms. No meaningful difference at this data
     scale — consistent with "every chart here is small": there isn't enough per-frame work for
     the renderer choice to show up.
  4. **Visual parity** (light/dark, en/zh-TW, 390px): clean on SVG. Gradient area fill, legend
     (per-market colored dots), axis labels, and tooltip all render correctly in every
     combination checked. No regression found.
- **Unchanged either way.** `MARKET_COLOR`/`CHART_CHROME` stay hex, confirmed — zrender computes
  colors internally whatever the renderer (see Open items).
- **Verified, not just flagged: the happy-dom test stub is *not* needed under SVG.** Removed the
  `Echarts: true` stub from `BaseChart.test.ts`, `KpiCard.test.ts` and `RevenueTrend.test.ts`
  against the SVG build — all 11 previously-stubbed tests passed unstubbed, confirming
  `SVGRenderer` never calls `canvas.getContext('2d')`. Not adopted now (PR 3 closed keeping
  Canvas, where the stub is still load-bearing), but worth knowing if SVG is ever re-spiked: it
  would simplify these three test files.
- **Outcome: closed, kept `CanvasRenderer`.** The decision rule was "adopt SVG if memory drops
  with no regression elsewhere." Memory didn't drop by the only method available to measure it
  live (JS heap is flat); the real backing-bitmap saving is genuine but modest (~1–5 MB depending
  on DPR) and unmeasured here, while bundle size measurably *grew* (+2%). That's a net negative on
  the numbers actually in hand, so `/stack-conventions` § Charts is not updated and `main` keeps
  `CanvasRenderer`. Re-open this spike only if a future gated PR (funnel, heatmap, gauge) turns out
  to render enough elements that Canvas's own guidance threshold ("thousands of elements") starts
  to apply, or if a way to measure real GPU/compositor memory (not just JS heap) becomes available
  and is worth the extra confidence. Server-side SVG rendering was and remains out of scope.

### PRs 4–7 — net-new chart types (gated, not scheduled)

- **PR 4 `feature/ai-point-annotations`** (gate: AI Assistant Chat build) — §4.4.1. Extend
  `TrendLineChart.vue` (or a thin sibling) with `annotations?: {t,label}[]` → ECharts `markPoint`.
  Add `MarkPointComponent` to `app/utils/echarts.ts`'s `use()` list. `AiChatResponse.chart.annotations`
  already matches this shape — no type change needed for this PR specifically.
- **PR 5 `feature/analytics-funnel-chart`** (gate: Analytics → Conversion Funnel tab) — §4.3.3. New
  `FunnelStage`/`FunnelSeries`/`FunnelResponse` types; new `FunnelChart.vue` using ECharts
  `series.funnel`, one per market, colored via `colorForMarket()`. Add `FunnelChart` to
  `app/utils/echarts.ts`'s `use()` list.
- **PR 6 `feature/analytics-retention-heatmap`** (gate: Analytics → User Retention tab) — §4.3.4.
  New `CohortRetentionCell`/`CohortRetentionResponse` types; new `RetentionHeatmap.vue` using
  ECharts `series.heatmap` + `visualMap`. Add `HeatmapChart` + `VisualMapComponent` to
  `app/utils/echarts.ts`'s `use()` list. Needs a new theming primitive — `useChartTheme()` gains a
  *sequential* palette (low→high), since the existing categorical per-market palette doesn't fit a
  heatmap.
- **PR 7 `feature/billing-usage-gauge`** (gate: Settings → Billing tab; lowest priority — not a
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
8. `pnpm test:e2e` still green (the smoke test's Chart.js comment is PR 2's).

## Open items (flagging, not fixing)

- `SVGRenderer` was spiked in PR 3 for performance and memory, not for color. In theory it would
  let *flat* fills reference `--ui-*` directly, since SVG participates in the CSS cascade. That
  wasn't pursued: every planned chart type uses at least one zrender-internal color computation
  the renderer choice doesn't route around, so the hex constants stay put regardless (PR 3 kept
  `CanvasRenderer` anyway).
- `AiChatResponse.chart`'s union doesn't actually discriminate: `type: 'line'|'bar'|'funnel'` but
  `series: MarketSeries[]` is fixed regardless of type, and `MarketSeries.points` has no field for a
  funnel stage name. Doesn't block PRs 4–7 as scoped (PR 5 defines a separate `FunnelResponse` type
  for the Analytics tab), but blocks an AI-generated funnel chart specifically, and predates this
  migration.
- PRs 4–7's relative order is inferred from `spec.md`'s Hero Flow list, not a committed roadmap
  (none exists as of this writing) — revisit when a module's build is actually scheduled.
- `vue-echarts`/`echarts` version compatibility with Vue 3.5.42 / Nuxt 4: **confirmed hands-on**,
  not just on paper — PR 1's manual QA and PR 3's prod-build spike both built, tested and ran the
  app against these versions with no compatibility issues.
- CSP: `vue-echarts` injects CSS globally by default; only needs an explicit style import under a
  strict CSP or Shadow DOM. Neither applies today — note in case Vercel headers ever add a CSP.

## What shipped

PR 1 + PR 2 landed together as `chore(charts): replace Chart.js with ECharts (#86)`. Where the
actual diff departed from the plan above:

- Registration lives in `app/utils/echarts.ts`, a side-effect module imported by `BaseChart.vue`,
  instead of a Nuxt plugin (`app/plugins/echarts.client.ts` as originally planned). This is a
  strictly better shape than the plan: registration is DOM-free and runs during SSR, and it
  confines the ECharts chunk to routes that actually render a chart instead of every route paying
  for it via the app entry.
- `ChartOption` is a project-defined type (`ComposeOption<LineSeriesOption | ...>` composed from
  exactly what's registered in `app/utils/echarts.ts`), not `vue-echarts`/`echarts`'s own
  `EChartsOption`. An unregistered series type fails at build time instead of only at runtime.
- `toPlainData()` — the Vue `readonly`-proxy guard carried forward "provisionally" in the plan —
  was dropped. Manual QA confirmed zrender doesn't need it.
- The happy-dom test stub is keyed `Echarts` (vue-echarts' rendered component name), not the local
  `VChart` import name the plan assumed. `happy-dom`'s `canvas.getContext('2d')` does return `null`
  in this repo, so the stub is load-bearing under `CanvasRenderer` — confirmed necessary, not
  speculative (and confirmed *not* necessary under `SVGRenderer`, per PR 3, though that renderer
  wasn't adopted).
- `withAlpha()` was dropped from `useChartTheme.ts`: PR 1's grep confirmed its one call site
  (`TrendLineChart.vue`) was gone, since ECharts' `areaStyle: { color, opacity }` takes flat color
  + separate opacity directly.
