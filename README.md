# Insight OS

AI-powered analytics SaaS (Frontend MVP) for cross-border e-commerce ops across four
markets — US, JP, TW, DE. Ships EN + 繁體中文.

## Stack

Nuxt 4 (`app/` dir) · TypeScript · Vue 3 `<script setup>` · Nuxt UI 4 ·
Tailwind CSS v4 · Pinia · TanStack Vue Query · Apache ECharts (`vue-echarts`) ·
`@nuxtjs/i18n`.

- **Package manager:** pnpm (`pnpm-lock.yaml` is committed)
- **Node:** 24 (see `.nvmrc`)

## Getting started

```bash
pnpm install      # runs `nuxt prepare` + husky setup via lifecycle scripts
pnpm dev          # http://localhost:3000
```

## Scripts

| Command          | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `pnpm dev`       | Start the dev server                             |
| `pnpm build`     | Production build (Nitro output)                  |
| `pnpm preview`   | Preview the production build                     |
| `pnpm lint`      | ESLint (flat config via `@nuxt/eslint`)          |
| `pnpm typecheck` | `nuxt typecheck` (vue-tsc)                       |
| `pnpm test`      | Vitest — `unit` (Node) + `nuxt` runtime projects |
| `pnpm test:e2e`  | Playwright smoke (not in the blocking CI gate)   |

## Quality gate

Every PR into `main` runs `lint · typecheck · test · build` in GitHub Actions
(`.github/workflows/ci.yml`). Deployment is owned by **Vercel** (preview per PR,
production on merge). Local Husky hooks (`lint-staged` + `commitlint`) are convenience;
CI is the enforced gate.

## Conventions

Project rules and detailed conventions live in `.claude/` — `CLAUDE.md` (charter) and
`.claude/skills/` (stack conventions incl. design tokens, mock API contract, i18n, product
spec, testing/CI, DoD & git workflow). `.claude/doc/` holds the decision records behind them.
Consult those before adding code.
