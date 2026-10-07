---
name: stack-conventions
description: Project conventions and integration gotchas for the Insight OS AI Analytics Platform — Nuxt 4 + TypeScript + Nuxt UI 4 + Tailwind CSS v4 + Pinia + TanStack Vue Query + Apache ECharts (vue-echarts) + @nuxtjs/i18n, with EN/zh-TW i18n and Admin/Analyst/Viewer roles. ALWAYS consult this skill before writing, reviewing, or refactoring ANY code in this project — scaffolding pages or components, configuring nuxt.config, styling and design tokens, dark mode, fetching data or creating stores, adding UI strings, permissions checks, or building charts. Also use it when debugging styling conflicts, SSR hydration issues, or dark-mode flashes.
---

# Insight OS — Stack Conventions

Conventions for the AI Analytics Platform codebase. When these rules conflict with a generic best practice, these rules win. Verify exact package versions against package.json before installing anything new.

## Project structure (Nuxt 4)

Nuxt 4 uses the `app/` source directory. Keep this layout:

```text
app/
├── app.config.ts              # Nuxt UI colors — the ONLY place the palette is declared
├── assets/css/main.css        # Tailwind + Nuxt UI entry (the whole CSS surface)
├── components/
│   ├── charts/                # Chart wrappers only
│   ├── common/                # Shared UI (PageHeader, DataTable, ...)
│   └── <module>/              # Feature components (dashboard/, analytics/, ...)
├── composables/
│   ├── queries/               # All Vue Query composables (useRevenueQuery, ...)
│   ├── useCan.ts              # Permission check
│   ├── useChartTheme.ts       # Chart colors (hex, SSR-safe — see Charts)
│   ├── useNotify.ts           # Toasts, wrapping Nuxt UI's useToast()
│   └── useTheme.ts            # Dark mode
├── layouts/default.vue        # Sidebar + topbar shell
├── middleware/auth.global.ts  # Route guards (auth + role) — global: applies to every route by default
├── pages/                     # File-based routes mirroring the sidebar IA
├── stores/                    # Pinia (auth, ui, filters)
└── types/                     # Shared TS types, incl. API response types
i18n/locales/en.json, zh-TW.json
server/api/                    # Mock API endpoints (Nitro)
```

Rules:
- Pages are thin: composition of feature components + queries. No business logic in pages.
- **A tab with a view of its own is a nested route** (`spec.md` §2, *Tabs*). The parent `pages/<module>.vue` renders what its tabs share (e.g. Analytics' controls bar) and a `<NuxtPage />`; each tab is `pages/<module>/<tab>.vue`. A detail view is a sibling, not a child, of its list — `pages/customers/index.vue` and `pages/customers/[id].vue` (+ `[id]/<tab>.vue`), with no `pages/customers.vue` — so the profile never renders inside the list or inherits its filters. A tab that only filters one list is a param, not a route.
- `<script setup lang="ts">` everywhere. Composables are `useX`. One component per file, PascalCase.

## Nuxt UI + Tailwind + design tokens

- Use `@nuxt/ui` (MIT; Nuxt UI Pro is merged into it, so `Dashboard*`, `Chat*`, `AuthForm`, `Stepper`, `Timeline`, `PricingTable` etc. are all available). It registers the Tailwind Vite plugin itself — do **not** also add `@tailwindcss/vite`.
- **The visual identity is declared in exactly one place:** `app/app.config.ts`.

  ```ts
  export default defineAppConfig({
    ui: { colors: { primary: 'emerald', neutral: 'slate' } },
  })
  ```

  Nuxt UI generates the full 50–950 ramps and every `--ui-*` alias from that. There is no separate `tokens.css` and no custom token vocabulary — one was retired deliberately (see the migration doc) because maintaining a private parallel set guarantees drift from what Nuxt UI's own components use.
- **When you need a color, use a Nuxt UI semantic token or a Tailwind utility.** Never a raw hex, and never a Tailwind palette color (`bg-emerald-500` ✗ — it hardcodes the brand and ignores dark mode).
  - Surfaces: `--ui-bg`, `--ui-bg-muted`, `--ui-bg-elevated`, `--ui-bg-accented`
  - Text: `--ui-text-highlighted`, `--ui-text`, `--ui-text-toned`, `--ui-text-muted`, `--ui-text-dimmed`
  - Borders: `--ui-border`, `--ui-border-muted`, `--ui-border-accented`
  - Semantic: `--ui-primary`, `--ui-success`, `--ui-info`, `--ui-warning`, `--ui-error`
  - Steps within a ramp when you need one: `--ui-color-primary-600`, `--ui-color-error-50`, …
- **Typography, radii and elevation come from Tailwind, not Nuxt UI.** Nuxt UI adds only `--ui-radius`, `--ui-container` and `--ui-header-height` on top of color. Use Tailwind's `--font-sans`, `--radius-sm/md/lg/xl`, `--shadow-sm/md/lg` (or the matching utilities). Fonts are the system stack — if a webfont is ever wanted, add `@nuxt/fonts` deliberately; do not declare a `--font-sans` naming fonts nothing loads.
- Dark mode: `.dark` on `<html>`, owned by our cookie-based `useTheme()`. Set `ui: { colorMode: false }` in nuxt.config so `@nuxtjs/color-mode` does not take over (it defaults to localStorage, which is not SSR-readable and reintroduces the light-flash). `@import '@nuxt/ui'` in `main.css` already registers the `dark:` variant on `.dark` — do not also declare `@custom-variant dark (&:where(.dark, .dark *));`, it's redundant. `--ui-*` re-declares itself under `.dark`, so component CSS is written once.
- Prefer Nuxt UI components over custom ones: `UTable`, `UCard`, `USelect`, `UTabs`, `UDrawer`, `UModal`, `UBadge`, `USkeleton`, `UDropdownMenu`, `UEmpty`, `UAlert`, `UStepper`, `UTimeline`. Build custom only when there is no equivalent, and put it in `components/common/`.
- Restyle components through the `ui` prop or `app.config.ts` slot overrides — Nuxt UI exposes every internal slot by name. `:deep()` is a last resort.
- Toasts go through `useNotify()` (`app/composables/useNotify.ts`), which wraps Nuxt UI's `useToast()`. Never reach for `nuxt.vueApp.config.globalProperties`.

## Dark mode

- Single source of truth: `.dark` class on `<html>`, managed by `useTheme()`.
- Persist the choice in a **cookie** (via `useCookie`), not localStorage — cookies are readable during SSR, which prevents the light-flash on first paint.
- Charts must react to theme changes (see Charts section).

## State management: Pinia vs Vue Query

Hard boundary — violating it is the most common review rejection:

- **Vue Query owns all server data.** Anything fetched from an API lives in query cache, never copied into Pinia.
- **Pinia owns client/UI state only**: auth session + current role, locale, theme, sidebar collapsed, and the *session defaults* filters fall back to — seeded from Settings → General (the default operating market, the presentation currency). Never a filter value, not even one a page remembers (see below).
- **Data-scope filters live in the URL, per page — not in Pinia.** Each page reads and writes its own query params (`market`, `segment`, `status`, `range`, …), so a filter set on one page never re-scopes another. Which controls earn a param, what a page restores, and why `/` never carries `?market=` are product behaviour: `/product-spec` → `spec.md` §2 (*State Management Boundary*).
  - **One route→filters registry** declares which params each route accepts and, per param, its default (fixed, or a session default from Settings) and whether the page remembers it. A param is declared on the route whose content its control scopes, and child routes inherit their parent's: Analytics' controls-bar params sit on `/analytics`, each tab's table params on the tab. Reading, writing, restoring, redirecting and building links all go through it — never a composable or a route list per filter; the vocabulary is `market`, `segment`, `status`, `channel`, `category`, `range`, `q`, `page`, `sort`/`order`.
  - **Resolve the whole URL, not param by param.** A URL carrying none of the page's params restores the page's memory; a URL carrying any of them is the whole scope — memory is not read, and each param it leaves out takes its default. Filling a partial URL's gaps from memory would break shared links, which leave out params at their fixed defaults (`spec.md` §2). Whatever comes from memory or a default is written into the URL with `replace`, so the address bar always states what the page shows.
  - **Page memory is one `useState('filter-memory')` map, keyed by route pattern, owned by the registry.** Not Pinia, so "Pinia never holds a filter value" stays a rule a reviewer can check; and no page touches it directly. It records whatever the page last showed, links included, skips params the registry marks unremembered (`page`, which restarts at 1), and also holds each parent's last tab. It is keyed by pattern, not record — `/customers/:id/orders` remembers one sort for every customer — and is cleared with `clearNuxtState` on sign-out and on a role switch.
  - **Every URL param follows four rules:**
    - **Omit only fixed defaults** — `/customers`, never `/customers?status=all&page=1`. A value drawn from Settings is always written, even when it equals the session default: a bare link would otherwise be filled in by the recipient's settings, so a shared `/customers` opens on their market, not the sender's.
    - **`push` for choices, `replace` for refinements** — picking a market is a decision the back button should undo; a debounced search box must not leave a history entry per keystroke, and neither may a restore.
    - **Validate on read** — the query string is user input; an unknown value is discarded and resolution carries on as if the param were absent. It never reaches a query key or the wire.
    - **The URL is the only live value** — memory is a fallback read only while the URL is bare, and Pinia holds only the session defaults.
  - **Only handoff links carry params to another page** — a link in the page's content that hands the question on (*Ask AI why →*), carrying only the params its target route accepts. Sidebar and top-bar links carry none, and no filter control lives in the chrome (`spec.md` §2). A page reached from the sidebar restores its own memory; nothing arrives from the page the user left.
  - **Tabs go through the registry too.** A parent route reached without a tab redirects (`replace`) to its remembered tab, else its first, keeping the URL's params. A tab link carries the parent's current params plus the target tab's remembered ones, so a tab switch (`push`) is always a complete URL and whole-URL resolution needs no exception; it is not a cross-page carry, since the shared controls are on screen on both sides.
  - **Not yet in the code:** `market` and `range` are still app-wide refs in `app/stores/filters.ts`, `displayCurrency` is not yet in the URL, and page memory does not exist; the registry that brings all three is #69. Don't add new readers or writers of those refs; a new data-scope filter is URL-backed from the start.
- **Display currency is *not* a data-scope filter, but it is URL-backed wherever a page has a currency selector** (`?currency=`). It is view state on a page-level control, so the registry treats it like any other param that page accepts: from the URL, from the page's memory when the URL is bare, or else the organization's presentation currency — always written into the URL. It never enters an API request or a query key — payloads carry every currency, so a switch is a client-side key switch with no refetch. A page with no selector accepts no `?currency=`. Which pages have a selector, and what renders on those that don't, is product behaviour: `/product-spec` → `currency-model.md` (§3).
- Query conventions:
  - Every query lives in `composables/queries/`, one file per domain.
  - Use a query-key factory per domain: `revenueKeys.byMarket(market, range)` — never inline array keys in components.
  - Page filters flow into queries as reactive refs read from the URL, already resolved through memory and defaults, so changing a filter changes the query key and refetches. A page with no control for a param reads its session default from Pinia directly.
  - Default `staleTime` 60s for analytics data; mutations must invalidate the relevant key factory branch.

## API layer

- One `$fetch.create()` instance (`$api`) in a Nuxt plugin — Nuxt's own client, not Axios; rationale in [`.claude/doc/axios-retirement.md`](../../doc/axios-retirement.md). `baseURL: '/api'` (relative on the server too), an `onRequest` hook attaches the auth-cookie token, and `onResponseError`/`onRequestError` hooks always **throw** a typed `ApiError`. Toasts are raised once, at the cache level, by `plugins/vue-query.ts` via `useNotify()` — not in the transport.
- All response shapes are typed in `types/api.ts`. Components never touch `$api` directly — only query composables do.
- Mock backend lives in `server/api/` (Nitro routes) returning realistic multi-market data with 200–500ms artificial latency, so loading skeletons are actually visible. Keep mock data generators in `server/utils/mock/`. The mock endpoints ARE the API contract — when the real backend arrives, only `baseURL` changes.

## i18n (en + zh-TW)

- `@nuxtjs/i18n` with lazy-loaded JSON per locale; default locale `en`, no prefix strategy decided in nuxt.config — don't change it casually, it affects every route.
- Key naming: `module.page.element` — e.g. `dashboard.kpi.revenue`, `team.members.inviteButton`. Shared strings go under `common.*`.
- **Zero hardcoded user-facing strings in templates or scripts.** Every new string is added to BOTH `en.json` and `zh-TW.json` in the same commit — a missing zh-TW key is a bug, not a TODO.
- Numbers, currency, and dates go through `Intl`-based formatters in `composables/useFormat.ts` (currency varies by market: USD/JPY/TWD/EUR; JPY and TWD render with no decimals — see `ZERO_DECIMAL_CURRENCIES`, which is display precision only and deliberately differs from storage).
- Layout must tolerate CJK: avoid fixed widths on text containers; test toggling to zh-TW when touching any layout.

## Roles & permissions (Admin / Analyst / Viewer)

- The permission map is ONE file: `app/constants/permissions.ts` — a map of ability strings (`'export:csv'`, `'team:manage'`, `'settings:billing'`) to allowed roles. Never scatter role checks like `role === 'admin'` through components.
- UI checks: `const { can } = useCan()` → `v-if="can('export:csv')"`. Viewer sees disabled controls with an explanatory tooltip only where the design specifies; otherwise hide.
- Route-level checks: `definePageMeta({ ability: 'team:manage' })` + the auth middleware redirects unauthorized roles. An Admin-only tab is its own child route with its own `ability` (`/settings/billing`), so *Hidden* hides its route as well as its tab.
- Client-side checks are UX, not security — note this in comments; the real backend must re-enforce.

## Charts (Apache ECharts)

Migrated from Chart.js — rationale and PR sequence in
[`.claude/doc/echarts-migration.md`](../../doc/echarts-migration.md).

- All charts go through wrapper components in `components/charts/` (e.g. `TrendLineChart.vue`, `Sparkline.vue`). Pages never import ECharts directly — everything renders through `BaseChart.vue`.
- Register chart types/components once in `app/utils/echarts.ts`, a side-effect module `BaseChart.vue` imports — not per component, and not a Nuxt plugin. Because it's an import rather than an app-wide plugin, ECharts only ships in the chunks of routes that actually render a chart. Each new chart type extends this one `use()` call and the `ChartOption` union beside it, never a second registration site.
- **Chart colors are hex in TypeScript, not CSS custom properties — and this is deliberate.** `MARKET_COLOR` in `app/constants/markets.ts` and `CHART_CHROME` in `app/composables/useChartTheme.ts` hold light/dark hex pairs. zrender's color parser only understands hex/`rgb()`/`hsl()`/the CSS named-color table — no `oklch()`, no `var()` resolution — so it cannot consume what Nuxt UI's `--ui-*` tokens resolve to. This is independent of which ECharts renderer is registered (Canvas or SVG): every chart uses at least one zrender-internal color computation (hover shading, `areaStyle` gradients) that needs a literal string either way. **Do not "unify" these values back into `--ui-*`.** They are the one sanctioned exception to the no-raw-hex rule; keep them visually coordinated with the `app.config.ts` palette by hand.
- Each market has ONE fixed color used everywhere it appears (charts, tags, legends), keyed by market in `MARKET_COLOR`. A market's color must never depend on how many series a chart happens to render — which is also why **ECharts' built-in `theme.color` array is not used**: it cycles by series index, so the same market changes color between charts. Always resolve explicitly via `colorForMarket()`.
- `useChartTheme()` derives everything from `isDark` as a `computed`. It must stay free of `getComputedStyle` and DOM reads so charts paint correctly during SSR and on first frame.
- Every chart has an accessible fallback: a hidden `<figcaption>` summarizing the data (see `BaseChart.vue`), and where the design calls for it, a toggleable data table.
- No component-test stub needed for `VChart` (rendered as `Echarts` — vue-echarts' component name, not the local import): `SVGRenderer` never calls `canvas.getContext('2d')`, so it doesn't hit `happy-dom`'s `null` return the way `CanvasRenderer` did. If a future chart type forces `CanvasRenderer` back on, re-add the stub — see PR 3 in `echarts-migration.md` for why it mattered then.

## Table conventions

- Tables go through `app/components/common/DataTable.vue`, a thin `UTable` wrapper bound to the `ApiListResponse<T>` / `ListQuery` contract in `types/api.ts`. Pages do not use `UTable` directly.
- `UTable` is built on TanStack Table (`useVueTable`), so going server-side means `:pagination-options="{ manualPagination: true, rowCount }"` **and** `:sorting-options="{ manualSorting: true }"` — they are two separate option bags, and missing either lets the table quietly re-sort or re-slice the one page it holds. Use this for any list that can grow; client-side mode is fine for small fixed sets.
- Standard features on analytics tables: sortable columns, column filters, global search, CSV export, an empty state via the `#empty` slot, and `column-pinning` for the sticky first columns on narrow viewports (pinning needs explicit column `size` values).
- **Sorting delegates to the server on the raw numeric field** — never coerce formatted currency strings client-side. Monetary columns sort on the **presentation-currency** amount, and the column states which currency it sorted on. How money cells render and sort is one decision, recorded once in **`/product-spec` → `currency-model.md`** (§3–4); read it before building any table with a money column. **Not yet implemented** — `CustomerList.vue` renders LTV in the functional currency only and sorts on that amount; tracked in issue #41.
- Export actions are permission-gated (`can('export:csv')`). Where the treatment is *disabled + tooltip* rather than hidden, the disabled control needs a wrapper element to receive pointer events.

## Comments

This codebase leans on comments to carry design intent, which only works while they stay true. Hold them to the same bar as the code.

- **Why, not what.** If a comment restates the line below it, delete it. `// Round-robin the markets so every one of the four is populated at any pool size` earns its place; `// build the customer` does not.
- **No history.** Never describe how the code used to behave, which bug prompted the change, or what was tried and rejected. That is what the commit message and the PR are for — a reader debugging under pressure needs the current contract, not a changelog. Rejected *designs* with lasting consequences go in [`.claude/doc/`](../../doc/README.md), never inline.
- **State the constraint, not the incident.** *"Offsets run backwards from `today`: a last-active stamp can only be in the past"* survives a rewrite of the arithmetic below it. *"The old version stamped a clock time and overshot"* is stale the moment anyone reads it.
- **Scannable.** One or two lines above the code they guard. A block running past ~5 lines is usually a design record filed in the wrong place.
- **Comment the surprising line, not the file.** A note at the point of the constraint beats a preamble the reader has to hold in their head.

A comment that would go stale if the code below changed shape is already a liability: tie it to the invariant, or drop it.

## Accessibility & quality floor

- Icon-only buttons always have `aria-label` (localized).
- Keyboard: visible focus states, Escape closes Drawer/Modal, focus returns to trigger.
- Respect `prefers-reduced-motion`. ECharts has no global animation default (unlike Chart.js), so `BaseChart.vue` forces `animation: false` into every chart's option itself when the OS asks for reduced motion. Nuxt UI components degrade themselves (shimmer → static muted text, indeterminate progress → pulse), so **never add a blanket `* { animation: none !important }`** — it overrides those graceful fallbacks with a worse one.
- WCAG AA contrast in both themes — the semantic tokens handle this if you don't hardcode colors (another reason the color rule above is absolute).

## Testing & delivery

- How to test, the Vitest/`@nuxt/test-utils`/Playwright setup, and the GitHub Actions CI gate live in the `testing-and-ci` skill. One gotcha to note here: use `vitest.config.mts` — do **not** add `"type": "module"` to `package.json` just for tests, it changes how every other `.js` config is parsed.
- Branching, commit conventions, Husky/commitlint hooks, the PR flow, and the Definition of Done live in the `dod-and-git-workflow` skill. Deploys are owned by **Vercel** (preview per PR, production on merge to `main`) — never scripted in CI.

## When unsure

- Styling a Nuxt UI component → the `ui` prop first, `app.config.ts` slot overrides second, `:deep()` last.
- Hydration mismatch → usually theme or locale read from the wrong place; both must come from cookies/SSR-safe sources.
- New dependency → check whether Nuxt UI or an existing lib already covers it before adding. Nuxt UI includes what used to be Pro, so reach for it before building a dashboard shell, chat surface, stepper, timeline or pricing table by hand.
- A color, radius or shadow you can't find a token for → it is almost certainly in Tailwind's theme. Adding a new custom property is a last resort, and chart hex is the only standing exception.
- Why something is the way it is → [`.claude/doc/`](../../doc/README.md).
