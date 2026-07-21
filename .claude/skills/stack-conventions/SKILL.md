---
name: stack-conventions
description: Project conventions and integration gotchas for the Insight OS AI Analytics Platform — Nuxt 4 + TypeScript + PrimeVue 4 (Aura theme) + Tailwind CSS + Pinia + TanStack Vue Query + Axios + Chart.js + @nuxtjs/i18n, with EN/zh-TW i18n and Admin/Analyst/Viewer roles. ALWAYS consult this skill before writing, reviewing, or refactoring ANY code in this project — scaffolding pages or components, configuring nuxt.config, styling (Tailwind vs PrimeVue tokens), dark mode, fetching data or creating stores, adding UI strings, permissions checks, or building charts. Also use it when debugging styling conflicts, SSR hydration issues, or dark-mode flashes.
---

# Insight OS — Stack Conventions

Conventions for the AI Analytics Platform codebase. When these rules conflict with a generic best practice, these rules win. Verify exact package versions against package.json before installing anything new.

## Project structure (Nuxt 4)

Nuxt 4 uses the `app/` source directory. Keep this layout:

```text
app/
├── assets/css/main.css       # Tailwind entry + CSS layer order
├── components/
│   ├── charts/                # Chart wrappers only
│   ├── common/                # Shared UI (PageHeader, EmptyState, ...)
│   └── <module>/              # Feature components (dashboard/, analytics/, ...)
├── composables/
│   ├── queries/               # All Vue Query composables (useRevenueQuery, ...)
│   ├── useCan.ts              # Permission check
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

## PrimeVue + Aura + Tailwind integration

This is the most fragile part of the stack. Follow exactly:

- **Required plugin: `tailwindcss-primeui`.** It bridges PrimeVue design tokens into Tailwind utility classes (`bg-primary`, `text-surface-500`, `text-muted-color`, etc.) — the whole color convention below depends on it. Setup differs by Tailwind major version, so check package.json first:
  - Tailwind v4: add `@plugin "tailwindcss-primeui";` in the main CSS file after `@import "tailwindcss";`.
  - Tailwind v3: add the plugin to `plugins: [require('tailwindcss-primeui')]` in tailwind.config.
- Use `@primevue/nuxt-module` with the **Aura preset** from `@primeuix/themes`. Do not hand-roll component CSS; customize via `definePreset()`.
- Dark mode: configure `theme.options.darkModeSelector: '.dark'`. Never use media-query dark mode — the app has a manual toggle.
- **Color authority is the `insight-os-design-tokens` skill, not raw Aura.** The design tokens ARE Aura primitives already resolved (primary emerald, surface slate), shipped as CSS custom properties in `tokens.css` (`--prim`, `--card`, `--border`, the `-ink`/`-soft` role variants, and the 14-color `--chart-*` ramp). Load `tokens.css` globally as the single source of truth for color; align the PrimeVue Aura preset to those values via `definePreset()` so component colors and the design tokens never diverge. When a color is needed, use `var(--token)` (or the matching `tailwindcss-primeui` class where it maps cleanly) — never a raw hex, and never a Tailwind palette color (`bg-emerald-500` is forbidden). Both `:root` and `.dark` are declared in `tokens.css`, so dark mode stays automatic.
- CSS layer order matters: PrimeVue's `cssLayer` must be enabled and ordered so Tailwind utilities can override component styles (`tailwind-base` → `primevue` → `tailwind-utilities` pattern, adapted to the Tailwind major version in package.json).
- Prefer PrimeVue components over custom ones: DataTable, Card, Select, DatePicker, Tabs, Drawer, Dialog, Toast, Tag, Skeleton, Menu. Build custom only when no PrimeVue equivalent exists, and put it in `components/common/`.
- Never style PrimeVue internals with `:deep()` selectors as a first resort — use the component's `pt` (pass-through) props or token overrides.

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

- One Axios instance created in a Nuxt plugin: `baseURL: '/api'`, request interceptor attaches the auth token from the auth store, response interceptor maps errors to a Toast and a typed `ApiError`.
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
- Series colors come from the design tokens' categorical ramp `--chart-0..13` (a 1:1 copy of the PrimeUI Charts palette, tuned per theme in `tokens.css`). Read them as CSS custom properties at render time; charts must re-render on theme change so the dark-mode variants apply. Assign series by ramp index — never remap chart series to Aura semantic colors (prim/danger/etc.), which carry status meaning.
- Each market has ONE fixed `--chart-*` index used everywhere it appears (charts, tags, legends): define the market→chart-index map in `app/constants/markets.ts`.
- Every chart has an accessible fallback: `aria-label` summarizing the data, and where the design calls for it, a toggleable data table.

## DataTable conventions

- Use PrimeVue DataTable with lazy pagination for lists that can grow; client-side mode is fine for small fixed sets.
- Standard features on analytics tables: sortable columns, column filters, global search, CSV export (DataTable `exportCSV()` where possible), and an empty state via `#empty` slot.
- Export actions are permission-gated (`can('export:csv')`).

## Accessibility & quality floor

- Icon-only buttons always have `aria-label` (localized).
- Keyboard: visible focus states, Escape closes Drawer/Dialog, focus returns to trigger.
- Respect `prefers-reduced-motion` for chart animations and transitions.
- WCAG AA contrast in both themes — token classes handle this if you don't hardcode colors (another reason the color rule above is absolute).

## Testing & delivery

- How to test, the Vitest/`@nuxt/test-utils`/Playwright setup, and the GitHub Actions CI gate live in the `testing-and-ci` skill. One gotcha to note here: use `vitest.config.mts` — do **not** add `"type": "module"` to `package.json` just for tests, it changes how every other `.js` config is parsed.
- Branching, commit conventions, Husky/commitlint hooks, the PR flow, and the Definition of Done live in the `dod-and-git-workflow` skill. Deploys are owned by **Vercel** (preview per PR, production on merge to `main`) — never scripted in CI.

## When unsure

- Styling conflict between Tailwind and PrimeVue → check CSS layer order first, `pt` props second, `:deep()` last.
- Hydration mismatch → usually theme or locale read from the wrong place; both must come from cookies/SSR-safe sources.
- New dependency → check whether PrimeVue or an existing lib already covers it before adding.
