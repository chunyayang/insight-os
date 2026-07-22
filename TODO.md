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
- ⬜ **1f** App shell — `layouts/default.vue` (topbar + grouped RBAC sidebar) + `components/common/`
- ⬜ **1g** Chart infra — Chart.js client plugin + token-aware wrappers

## Phase 2 — Vertical slice: Login + Dashboard

- ⬜ **2a** Login page (validation, demo role picker, language switcher)
- ⬜ **2b** Dashboard mock endpoint + query composable
- ⬜ **2c** Dashboard UI (KPI cards, anomaly strip, revenue chart, AI summary)
- ⬜ **2d** Empty thin pages for remaining routes (RBAC-gated)

## Phase 3 — Tests & DoD

- ⬜ Unit: `useFormat`, permissions matrix, market→chart-index map
- ⬜ Component smoke: a KPI card + auth-middleware redirect
- ⬜ Playwright E2E: login → dashboard → anomaly visible
- ⬜ Confirm full CI gate green on every slice

## Decisions & deviations (log)

- **TypeScript pinned to 6.x** — `typescript-eslint` and `vue-tsc` do not yet support the
  TS 7 native port; the rest of the stack is on current majors.
- **PrimeVue pinned to v4** (nuxt-module 4.5.5 + `@primeuix/themes` 1.2.5) per the product
  spec, though v5 is the current latest. Chosen deliberately (see session decision).
- **Node 24 · pnpm 11** — `onlyBuiltDependencies`/`allowBuilds` live in `pnpm-workspace.yaml`
  (pnpm 11 no longer reads the `pnpm` field in `package.json`).
