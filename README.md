# Insight OS

AI-powered analytics SaaS (Frontend MVP) for cross-border e-commerce ops across four
markets — US, JP, TW, DE. Ships EN + 繁體中文.

## Stack

Nuxt 4 (`app/` dir) · TypeScript · Vue 3 `<script setup>` · PrimeVue 4 (Aura) ·
Tailwind CSS v4 + `tailwindcss-primeui` · Pinia · TanStack Vue Query · Axios ·
Chart.js · `@nuxtjs/i18n`.

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
`.claude/skills/` (stack conventions, mock API contract, i18n, design tokens, product
spec, testing/CI, DoD & git workflow). Consult those before adding code.
