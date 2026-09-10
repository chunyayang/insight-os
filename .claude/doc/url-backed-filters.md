# URL-backed page filters

**Status:** Settled — 2026-09-10. Supersedes the global Pinia market filter.

## The decision

Data-scope filters live in the **URL query**, scoped to the page, not in a shared Pinia ref.
Pinia keeps only *session defaults* (the default operating market from Settings → General).

```
/customers?market=JP     ← this page is scoped to JP
/                        ← Dashboard, unaffected, at the session default
```

Implemented by `app/composables/useUrlFilter.ts` (generic) and `useMarketFilter.ts` (market),
over the pure helpers in `app/utils/urlFilter.ts`.

## What it replaced, and why that design existed

`stores/filters.ts` previously held a single app-wide `market` ref that every page read *and*
wrote. That was not accidental — three places in the spec called for it:

- §2 listed "market selections" as global Pinia state alongside theme and locale.
- §4.4 (AI Assistant): "Market context comes from the live global market filter… **Do not
  introduce a second source of truth for market.**"
- §4.10 (Settings): the default operating market "seeds the global market filter at session
  start (the same filter Dashboard, Analytics and the list pages read); it is not a separate
  per-page setting."

The reasoning was **drill-down continuity**. The hero flow is an investigation: a Dashboard
anomaly card ("JP conversion down 18%") → *Ask AI why →* AI Assistant → Analytics → Customers.
The market is the *subject* of that investigation, and it should follow the user through the
chain rather than be re-picked on every screen. That goal was right.

## Why it changed anyway

The mechanism, not the goal, was wrong. A shared mutable ref bought continuity at four costs:

1. **Action at a distance.** Picking JP on Customers silently re-scoped the Dashboard KPI
   cards, which read the same ref. The store's own comment defended `displayCurrency` being
   page-scoped precisely because "a control that isn't visible on a page must never silently
   change that page's numbers" — and then let market do exactly that. Market escaped the
   objection only on the technicality that the pages happen to render a market control too;
   pre-set to a value chosen on another screen, that control looks identical to one the user
   set, so a narrowed table reads as "we have no US customers."
2. **No side-by-side work.** Holding Analytics on JP while browsing all customers was
   impossible by construction.
3. **Not addressable.** The market lived only in memory: no bookmark, no shareable link, no
   back button, and a refresh silently reset to `All`. For a tool whose daily use is "look at
   one market and tell someone about it," that is a real gap.
4. **It was already breaking down.** `DashboardRevenueTrend` had quietly given itself a
   component-local `market` ref rather than use the global one, so the Dashboard already
   shipped two unrelated market scopes — tabs that moved the chart and a hidden global value
   that moved the KPI cards above it.

The URL keeps the goal and drops the costs: continuity comes from **links carrying the param
forward** (an anomaly card deep-links to `/ai-assistant?market=JP`), which is *more* reliable
than shared state, because it survives a refresh and a paste into Slack. §4.4's "no second
source of truth" still holds — the route is that one source.

## Rules for filters that follow

Applies to any data-scope filter — `segment`, `status`, `channel`, `range`, `q`, `page`,
`sort`/`order` — which is deliberately the same vocabulary the list API already uses
(`mock-api-contract`, spec §6). One name, three places: URL → composable → request.

1. **Omit defaults.** `/customers`, never `/customers?market=All&segment=all&page=1`.
2. **`push` for choices, `replace` for refinements.** Picking a market is a discrete decision
   the back button should undo; a debounced search box must not leave 20 history entries
   between the user and the previous page.
3. **Validate on read.** The query string is user-editable input. `?market=XX` falls back to
   the default and never reaches a query key or the wire.
4. **Never mirror into Pinia.** A copy in a store recreates the two-sources-of-truth problem
   this removed. The store may hold a *seed*; it may not hold the live value.
5. **No URL param without a visible control.** A query param is a view onto a control the
   user can see and change on *this* page. A page with no such control reads the session
   default straight from Pinia and stops there — see *Dashboard*, below. The alternative
   (a param nothing on the page explains) is the same silent-control problem this design
   exists to avoid, just moved from a shared ref into the address bar.

**Not in scope:** chrome that isn't data scope (sidebar collapsed, theme, locale — locale has
its own i18n strategy). `displayCurrency` is a genuine edge case: a display projection rather
than data scope, but reproducible view state whose control *is* visible on the one page that
has it. Left in Pinia for now; revisit when Analytics is built.

## Dashboard: no market param, by rule 5

The KPI cards have no market control (spec §4.2: they're "cross-market aggregates"), so
`useDashboardSummary` reads `filters.defaultMarket` — the session default — directly, never
through `useUrlFilter`. `/` never carries `?market=`; there is nothing on the page a reader
could point to as the reason it's there.

`RevenueTrend`'s market tabs stay chart-local (a plain component ref, not wired to the URL or
to `defaultMarket`): the control is visible, but it's this one chart's control, not the
page's, so by rule 5 it doesn't get a shared or URL-level home either. The Dashboard's two
market scopes — the KPI cards' invisible session default and the trend chart's own tabs — are
intentionally independent. Confirmed 2026-09-10; not an open question.

## Follow-ups this opens

- **The spec repo needs updating** (`insight-os-doc`): §2 line 30, §4.4, §4.10 all still
  describe the global filter. Until then the spec and the code disagree.
- **`range` is still global** in `stores/filters.ts`. It is a data-scope filter by the same
  argument and should move next; left alone here to keep this change reviewable.
- **Settings → General** does not yet write `defaultMarket`. The seam exists (`setDefaultMarket`).
