---
name: stack-conventions
description: Project conventions and integration gotchas for the Insight OS AI Analytics Platform — Nuxt 4 + TypeScript + Nuxt UI 4 + Tailwind CSS v4 + Pinia + TanStack Vue Query + Axios + Chart.js + @nuxtjs/i18n, with EN/zh-TW i18n and Admin/Analyst/Viewer roles. ALWAYS consult this skill before writing, reviewing, or refactoring ANY code in this project — scaffolding pages or components, configuring nuxt.config, styling and design tokens, dark mode, fetching data or creating stores, adding UI strings, permissions checks, or building charts. Also use it when debugging styling conflicts, SSR hydration issues, or dark-mode flashes.
---

# Insight OS — Stack Conventions

Conventions for the AI Analytics Platform codebase. When these rules conflict with a generic best practice, these rules win. Verify exact package versions against package.json before installing anything new.

> **Migration in flight (started 2026-07-30).** The UI layer is moving from PrimeVue 4 to Nuxt UI 4.10.
> This skill describes the **target** state. Until the final PR lands, code you open may still use
> PrimeVue components — migrate what you touch rather than matching it. Rationale, PR sequence and
> the rejected alternatives are in [`.claude/doc/nuxt-ui-migration.md`](../../doc/nuxt-ui-migration.md).

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
├── middleware/auth.ts         # Route guards (auth + role)
├── pages/                     # File-based routes mirroring the sidebar IA
├── stores/                    # Pinia (auth, ui, filters)
└── types/                     # Shared TS types, incl. API response types
i18n/locales/en.json, zh-TW.json
server/api/                    # Mock API endpoints (Nitro)
```

Rules:
- Pages are thin: composition of feature components + queries. No business logic in pages.
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
- Dark mode: `.dark` on `<html>`, owned by our cookie-based `useTheme()`. Set `ui: { colorMode: false }` in nuxt.config so `@nuxtjs/color-mode` does not take over (it defaults to localStorage, which is not SSR-readable and reintroduces the light-flash). Declare `@custom-variant dark (&:where(.dark, .dark *));` in `main.css` explicitly. `--ui-*` re-declares itself under `.dark`, so component CSS is written once.
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
- **Pinia owns client/UI state only**: auth session + current role, locale, theme, sidebar collapsed, global filters (date range, selected markets). **Display currency is *not* a global filter** — it is an Analytics-scoped display/normalization control (the selector appears only on Analytics). Off Analytics, monetary values render in each record's native currency. See `mock-api-contract.md` (*Currency & money conversion → Display scope*).
- Query conventions:
  - Every query lives in `composables/queries/`, one file per domain.
  - Use a query-key factory per domain: `revenueKeys.byMarket(market, range)` — never inline array keys in components.
  - Global filters flow into queries as reactive refs so changing a filter refetches automatically.
  - Default `staleTime` 60s for analytics data; mutations must invalidate the relevant key factory branch.

## API layer

- One Axios instance created in a Nuxt plugin: `baseURL: '/api'`, request interceptor attaches the auth token from the auth store, response interceptor maps errors to a typed `ApiError`, surfaced via `useNotify()`.
- All response shapes are typed in `types/api.ts`. Components never touch Axios directly — only query composables do.
- Mock backend lives in `server/api/` (Nitro routes) returning realistic multi-market data with 200–500ms artificial latency, so loading skeletons are actually visible. Keep mock data generators in `server/utils/mock/`. The mock endpoints ARE the API contract — when the real backend arrives, only `baseURL` changes.

## i18n (en + zh-TW)

- `@nuxtjs/i18n` with lazy-loaded JSON per locale; default locale `en`, no prefix strategy decided in nuxt.config — don't change it casually, it affects every route.
- Key naming: `module.page.element` — e.g. `dashboard.kpi.revenue`, `team.members.inviteButton`. Shared strings go under `common.*`.
- **Zero hardcoded user-facing strings in templates or scripts.** Every new string is added to BOTH `en.json` and `zh-TW.json` in the same commit — a missing zh-TW key is a bug, not a TODO.
- Numbers, currency, and dates go through `Intl`-based formatters in `composables/useFormat.ts` (currency varies by market: USD/JPY/TWD/EUR; JPY has no decimals).
- Layout must tolerate CJK: avoid fixed widths on text containers; test toggling to zh-TW when touching any layout.

## Roles & permissions (Admin / Analyst / Viewer)

- The permission map is ONE file: `app/constants/permissions.ts` — a map of ability strings (`'export:csv'`, `'team:manage'`, `'settings:billing'`) to allowed roles. Never scatter role checks like `role === 'admin'` through components.
- UI checks: `const { can } = useCan()` → `v-if="can('export:csv')"`. Viewer sees disabled controls with an explanatory tooltip only where the design specifies; otherwise hide.
- Route-level checks: `definePageMeta({ ability: 'team:manage' })` + the auth middleware redirects unauthorized roles.
- Client-side checks are UX, not security — note this in comments; the real backend must re-enforce.

## Charts (Chart.js)

- All charts go through wrapper components in `components/charts/` (e.g. `TrendLineChart.vue`, `MarketBarChart.vue`). Pages never import Chart.js directly.
- Register Chart.js controllers/elements once in a client-side plugin, not per component.
- **Chart colors are hex in TypeScript, not CSS custom properties — and this is deliberate.** `MARKET_COLOR` in `app/constants/markets.ts` and `CHART_CHROME` in `app/composables/useChartTheme.ts` hold light/dark hex pairs. Chart.js needs real color strings on a canvas, and `withAlpha()` parses **hex only**: Nuxt UI's tokens resolve to `oklch()`, which `withAlpha` passes through unfaded, silently turning every area fill opaque. `color-mix()` is not a fix — canvas `fillStyle` will not reliably parse it. **Do not "unify" these values back into `--ui-*`.** They are the one sanctioned exception to the no-raw-hex rule; keep them visually coordinated with the `app.config.ts` palette by hand.
- Each market has ONE fixed color used everywhere it appears (charts, tags, legends), keyed by market in `MARKET_COLOR`. A market's color must never depend on how many series a chart happens to render — which is also why **Chart.js's built-in `Colors` plugin is not used**: it assigns by dataset index, so the same market changes color between charts.
- `useChartTheme()` derives everything from `isDark` as a `computed`. It must stay free of `getComputedStyle` and DOM reads so charts paint correctly during SSR and on first frame.
- Every chart has an accessible fallback: `aria-label` summarizing the data, and where the design calls for it, a toggleable data table.

## Table conventions

- Tables go through `app/components/common/DataTable.vue`, a thin `UTable` wrapper bound to the `ApiListResponse<T>` / `ListQuery` contract in `types/api.ts`. Pages do not use `UTable` directly.
- `UTable` is built on TanStack Table (`useVueTable`), so going server-side means `:pagination-options="{ manualPagination: true, rowCount }"` **and** `:sorting-options="{ manualSorting: true }"` — they are two separate option bags, and missing either lets the table quietly re-sort or re-slice the one page it holds. Use this for any list that can grow; client-side mode is fine for small fixed sets.
- Standard features on analytics tables: sortable columns, column filters, global search, CSV export, an empty state via the `#empty` slot, and `column-pinning` for the sticky first columns on narrow viewports (pinning needs explicit column `size` values).
- **Sorting delegates to the server on the raw numeric field.** Money cells render per record in `nativeCurrency`, and mixed-currency sorting is currency-blind by design in the MVP — never coerce formatted currency strings client-side.
- Export actions are permission-gated (`can('export:csv')`). Where the treatment is *disabled + tooltip* rather than hidden, the disabled control needs a wrapper element to receive pointer events.

## Accessibility & quality floor

- Icon-only buttons always have `aria-label` (localized).
- Keyboard: visible focus states, Escape closes Drawer/Modal, focus returns to trigger.
- Respect `prefers-reduced-motion`. Chart.js is handled globally in `plugins/chartjs.client.ts`. Nuxt UI components degrade themselves (shimmer → static muted text, indeterminate progress → pulse), so **never add a blanket `* { animation: none !important }`** — it overrides those graceful fallbacks with a worse one.
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
