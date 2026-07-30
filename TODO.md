# Insight OS — Build Progress

Day-1 goal: a runnable Nuxt 4 skeleton proven end-to-end by one vertical slice
(Login → Dashboard). Each item below ships as its own small, single-concern branch →
squash-merge to `main`, independently green on CI. See the approved plan for detail.

Legend: ✅ done · 🔜 next · ⬜ pending

## Phase 0 — Bootstrap

- ✅ git init on `main`; `.gitignore` / `.nvmrc` / `.npmrc`
- ✅ Scaffold Nuxt 4 + pinned deps (PrimeVue **4** / Aura, Tailwind v4 + primeui, Pinia, Vue Query, Axios, Chart.js, i18n)
- ✅ Tooling: ESLint + Prettier, `vitest.config.mts`, Playwright, Husky + commitlint + lint-staged, GitHub Actions CI
- ✅ Commit scaffold on `main` (`chore: scaffold`)

## Phase 1 — Cross-cutting foundation

- ✅ **1a** Design tokens loaded globally + Aura preset alignment + cookie dark mode (`useTheme`, SSR-safe)
- ✅ **1b** API layer — `app/types/api.ts` + Axios plugin + Vue Query plugin (SSR hydrate)
- ✅ **1c** Mock backend — `server/utils/mock/` + per-day FX rate table + JP weekly anomaly seed (13 unit tests)
- ✅ **1d** i18n locales (en / zh-TW) + `useFormat` (JPY 0-dec) + `<html lang>` (30 unit tests)
- ✅ **1e** Auth + RBAC — `permissions.ts`, `markets.ts`, `useCan`, Pinia stores, auth middleware
- ✅ **1f** App shell — `layouts/default.vue` (topbar + grouped RBAC sidebar) + `components/common/`
- ✅ **1g** Chart infra — Chart.js client plugin + token-aware wrappers

## Phase 2 — Vertical slice: Login + Dashboard

- ✅ **2a** Login page (validation, demo role picker, language switcher)
- ✅ **2b** Dashboard mock endpoint + query composable
- ✅ **2c** Dashboard UI (KPI cards, anomaly strip, revenue chart, AI summary)
- ✅ **2d** Empty thin pages for remaining routes (RBAC-gated)

## Phase 3 — Tests & DoD

- ✅ Unit: `useFormat`, permissions matrix, market→chart-index map, FX/money rules, locale parity
- ✅ Component smoke (Nuxt env): KpiCard rendering + useCan role reactivity
- ✅ Playwright E2E: login → dashboard → JP anomaly; viewer route block; theme + locale switch
- ✅ Full CI gate green (lint · typecheck · test · build); 65 unit/component tests + 3 E2E

## Decisions & deviations (log)

- **TypeScript pinned to 6.x** — `typescript-eslint` and `vue-tsc` do not yet support the
  TS 7 native port; the rest of the stack is on current majors.
- **Migrating PrimeVue 4 → Nuxt UI 4.10** (decided 2026-07-30, superseding the "PrimeVue pinned
  to v4" decision). Three findings invalidated the pin: `primefaces/primevue` is **archived**
  (MIT forever but frozen — no security patches, no future Vue/Nuxt compat); **PrimeVue 5 moves
  `Chart` to the paid PRO tier**, inverting the original reason we pinned to v4; and the v5
  Community licence requires _all_ of <$1M revenue, <5 devs, <10 employees and never >$3M outside
  capital, re-confirmed yearly — every one a tripwire on the success path for a commercial SaaS.
  Nuxt UI is MIT with Pro merged in free, actively developed, and its table is TanStack-based.
  Full rationale, rejected alternatives and PR sequence: `.claude/doc/nuxt-ui-migration.md`.
- **Custom design tokens retired** as part of that migration. `tokens.css` was Aura primitives
  resolved by hand, which Nuxt UI regenerates from `app.config.ts`; typography/radii/elevation
  come from Tailwind v4's own theme; the motion keyframes had zero consumers. The
  `insight-os-design-tokens` skill is deleted. Chart colors are the one exception and now live as
  hex in TypeScript (`MARKET_COLOR`, `CHART_CHROME`) because Chart.js cannot consume `oklch()`.
- **Node 24 · pnpm 11** — `onlyBuiltDependencies`/`allowBuilds` live in `pnpm-workspace.yaml`
  (pnpm 11 no longer reads the `pnpm` field in `package.json`).
- **Playwright config is `playwright.config.mts`** — Playwright loads a `.ts` config as
  CJS, so `import.meta.url` threw; `.mts` fixes it without adding `"type": "module"` to
  package.json (which would change how every other `.js` config is parsed). Same reasoning
  as `vitest.config.mts`.
- **Nested composables opt-in** — `imports.dirs: ['composables/**']` in nuxt.config, because
  Nuxt only auto-imports `composables/` one level deep and the conventions require
  `composables/queries/`.
- **Chart wrappers take `summary`, not `ariaLabel`** — `ariaLabel` collides with the native
  `aria-label` attribute and cannot be type-checked as a prop.
- **E2E stays out of the blocking CI gate** for the MVP (per testing-and-ci); run locally
  with `MOCK_NO_LATENCY=1 pnpm test:e2e`.
- **`typescript` is excluded from Dependabot major-version bumps** — see the pin above. Ignore
  rules live in `.github/dependabot.yml`. The PrimeVue trio was also ignored there until the
  Nuxt UI migration made it moot.
- **CI can fail with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`** on freshly-bumped deps —
  pnpm's built-in supply-chain guard rejects packages published too recently (currently
  ~24h). Not a bug; re-run CI later rather than investigating. First seen on Dependabot
  PR #13, 2026-07-25. See `.npmrc`.
