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

### PR 2 — `docs/echarts-conventions`
- `.claude/skills/stack-conventions/SKILL.md` Charts section: drop the "migration decided, not
  started" blockquote; rewrite the Chart.js-specific rules as their ECharts-true equivalents — the
  rules mostly survive verbatim, only the library name and the "why hex" sentence change. One
  rule does change shape: registration is no longer "once in a client-side plugin" but once in
  `app/utils/echarts.ts`, a side-effect module `BaseChart.vue` imports, so ECharts ships only in
  the chunks of routes that render a chart.
- `.claude/CLAUDE.md`: stack line `Chart.js` → `Apache ECharts (vue-echarts)`; correct the
  "can't consume oklch()" line.
- Retire the PrimeVue / `tokens.css` comments left over from the Nuxt UI migration. Each either
  states something no longer true or narrates history, which `/stack-conventions` § Comments
  rules out. Restate the constraint where one survives; drop the comment where none does:
  - `app/composables/useTheme.ts:8-9`: "PrimeVue's darkModeSelector ('.dark') and tokens.css
    both key off that same class" is false now. Name what does key off `.dark` today: Nuxt UI's
    `--ui-*` tokens. `useChartTheme()` reads the same cookie through `isDark`.
  - `app/composables/useNotify.ts:1-4`: the explicit import existed to win an auto-import race
    against PrimeVue's `useToast`. The race is gone, so the comment goes. The import can stay
    explicit or fall back to auto-import; either is correct.
  - `app/app.config.ts:9-10`: "the same values the retired tokens.css resolved by hand" is
    history; `nuxt-ui-migration.md` already records it. Drop the sentence.
  - `app/components/dashboard/AnomalyAlerts.vue:53-54`: keep the constraint (`to` makes the
    UButton its own NuxtLink, so wrapping it would nest a `<button>` in an `<a>`) and drop "the
    PrimeVue version needed".
  - `app/pages/login.vue:18`: "UInput has no equivalent of PrimeVue's `toggle-mask`" becomes
    "UInput has no built-in reveal toggle".
- `test/e2e/smoke.test.ts:7`: "Chart.js" → "ECharts" in the stack list.
- PR 4 below says "the plugin's `use()` list", and PRs 5–6 say "add to `use()`". Point all three
  at `app/utils/echarts.ts`.
- Append a "What shipped" section to this doc once PR 1 + 2 land. Record where PR 1 departed from
  the plan above: registration in `app/utils/echarts.ts` instead of a plugin, a `ChartOption`
  type composed from the registered modules instead of `EChartsOption`, `toPlainData()` dropped
  (QA showed zrender doesn't need it), and the test stub keyed `Echarts` (vue-echarts' component
  name) instead of `VChart`.

### PR 3 — `chore/echarts-svg-renderer` (scheduled: after PR 2, before any gated PR)

Spike `SVGRenderer` against `CanvasRenderer`, then keep whichever the numbers favor.

- **Why SVG is a candidate.** Every chart here is small. The densest planned chart is the Dashboard
  trend: 4 series × at most 366 daily points (YTD), with symbols off. The Dashboard's four KPI
  sparklines hold about 30 points each, and the weekly retention cohort grid (§4.3.4) has a few
  hundred cells at most. ECharts' own guidance is Canvas for thousands of elements or heavy
  effects, and SVG for many small instances, mobile and low memory. Each canvas also holds a
  backing bitmap at `devicePixelRatio`: about 5.5 MB for the trend chart at 2×, where SVG holds a
  handful of nodes. SVG also stays sharp when zoomed or printed, which matters for report export.
- **The swap.** Register `SVGRenderer` instead of `CanvasRenderer` in `app/utils/echarts.ts`, and
  pass `init-options` with `renderer: 'svg'` from `BaseChart.vue`. ECharts initializes with Canvas
  by default and fails when Canvas isn't registered. Register one renderer. Register both only if
  a specific chart needs Canvas, and record the bundle cost if so.
- **Measure on the prod build, before and after.** Put the numbers in the PR:
  1. ECharts chunk size (gzip).
  2. Dashboard memory with all five charts mounted.
  3. Frame time for tooltip hover and market-tab switching at 4× CPU throttle.
  4. Visual parity: light/dark, en/zh-TW, 390px. Cover the gradient area, legend, `hideOverlap`
     axis labels and tooltip.
- **Unchanged either way.** `MARKET_COLOR`/`CHART_CHROME` stay hex, because zrender computes
  colors internally whatever the renderer (see Open items). The happy-dom test stub probably
  stays: whether zrender still measures text on a canvas under SVG is unverified. Remove the stub
  once to find out, as PR 1 did.
- **Outcome.** Adopt SVG if memory drops with no regression elsewhere, and update
  `/stack-conventions` § Charts. Otherwise close the PR and record the measurements here, so the
  question isn't re-spiked. Server-side SVG rendering (drawing the chart into the SSR HTML) is out
  of scope. Note it as a follow-up only if `vue-echarts` turns out to support it.

### PRs 4–7 — net-new chart types (gated, not scheduled)

- **PR 4 `feature/ai-point-annotations`** (gate: AI Assistant Chat build) — §4.4.1. Extend
  `TrendLineChart.vue` (or a thin sibling) with `annotations?: {t,label}[]` → ECharts `markPoint`.
  Add `MarkPointComponent` to the plugin's `use()` list. `AiChatResponse.chart.annotations`
  already matches this shape — no type change needed for this PR specifically.
- **PR 5 `feature/analytics-funnel-chart`** (gate: Analytics → Conversion Funnel tab) — §4.3.3. New
  `FunnelStage`/`FunnelSeries`/`FunnelResponse` types; new `FunnelChart.vue` using ECharts
  `series.funnel`, one per market, colored via `colorForMarket()`. Add `FunnelChart` to `use()`.
- **PR 6 `feature/analytics-retention-heatmap`** (gate: Analytics → User Retention tab) — §4.3.4.
  New `CohortRetentionCell`/`CohortRetentionResponse` types; new `RetentionHeatmap.vue` using
  ECharts `series.heatmap` + `visualMap`. Add `HeatmapChart` + `VisualMapComponent` to `use()`.
  Needs a new theming primitive — `useChartTheme()` gains a *sequential* palette (low→high), since
  the existing categorical per-market palette doesn't fit a heatmap.
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

- `SVGRenderer` is scheduled as PR 3 for performance and memory, not for color. In theory it would
  let *flat* fills reference `--ui-*` directly, since SVG participates in the CSS cascade. That
  isn't pursued: every planned chart type uses at least one zrender-internal color computation the
  renderer choice doesn't route around, so the hex constants stay whichever renderer PR 3 keeps.
- `AiChatResponse.chart`'s union doesn't actually discriminate: `type: 'line'|'bar'|'funnel'` but
  `series: MarketSeries[]` is fixed regardless of type, and `MarketSeries.points` has no field for a
  funnel stage name. Doesn't block PRs 4–7 as scoped (PR 5 defines a separate `FunnelResponse` type
  for the Analytics tab), but blocks an AI-generated funnel chart specifically, and predates this
  migration.
- PRs 4–7's relative order is inferred from `spec.md`'s Hero Flow list, not a committed roadmap
  (none exists as of this writing) — revisit when a module's build is actually scheduled.
- `vue-echarts`/`echarts` version compatibility with Vue 3.5.42 / Nuxt 4 is verified on paper
  (registry peer ranges) only, not hands-on — first real check is PR 1's manual QA.
- CSP: `vue-echarts` injects CSS globally by default; only needs an explicit style import under a
  strict CSP or Shadow DOM. Neither applies today — note in case Vercel headers ever add a CSP.
