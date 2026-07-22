# Insight OS

AI-powered analytics SaaS (Frontend MVP) for cross-border e-commerce ops across
four markets — US, JP, TW, DE. Ships EN + 繁體中文.

## Stack
Nuxt 4 (`app/` dir) · TypeScript · Vue 3 `<script setup>` · PrimeVue 4 (Aura) ·
Tailwind CSS + `tailwindcss-primeui` · Pinia · TanStack Vue Query · Axios ·
Chart.js · `@nuxtjs/i18n`. Verify exact versions in `package.json` before adding deps.

Package manager: **pnpm** (commit `pnpm-lock.yaml`; set the `packageManager` field in `package.json`). Node: **24**.

## Layout (Nuxt 4)
App code lives in `app/`: `components/{charts,common,<module>}/`,
`composables/{queries,...}`, `layouts/`, `middleware/`, `pages/` (mirror the sidebar IA),
`stores/` (Pinia), `types/`, `constants/`. Mock API: `server/api/` (Nitro).
i18n JSON: `i18n/locales/`.

## Hard rules (always apply)
- **State boundary:** Vue Query owns all server data; Pinia owns UI state only. Never clone server data into Pinia.
- **i18n:** no hardcoded user-facing strings; every key exists in BOTH `en.json` and `zh-TW.json`. Format numbers/dates/currency via `composables/useFormat.ts` (JPY = 0 decimals).
- **Color:** no raw hex, no Tailwind palette colors (`bg-emerald-500` ✗). Use design tokens — `var(--…)` or `tailwindcss-primeui` classes. Dark mode is the `.dark` class, persisted via cookie.
- **Money:** conversion is server-side (historical daily rates); the client only formats. The currency selector is Analytics-only — elsewhere show each record's native currency.
- **Permissions:** central map in `app/constants/permissions.ts`, checked via `useCan()`. Client-side checks are UX only — re-enforce server-side.
- **Pages are thin:** compose feature components + query composables; no business logic in pages. `<script setup lang="ts">` everywhere.
- **Done means done:** every change meets the Definition of Done and passes CI (lint · typecheck · test · build) before merge to `main`. See `/dod-and-git-workflow` and `/testing-and-ci`.

## Detailed conventions live in skills (loaded on demand)
Reference material sits in `.claude/skills/` and loads only when relevant — prefer it over guessing:
`/stack-conventions`, `/mock-api-contract`, `/i18n-workflow`,
`/insight-os-design-tokens`, `/product-spec`, `/testing-and-ci`,
`/dod-and-git-workflow`.

### `/product-spec` is distributed out-of-band
The product spec is **not tracked in this repo** (gitignored). It lives in the
separate private repo `insight-os-doc`. To get it, clone that repo and link it in:

```sh
git clone <insight-os-doc-remote> ~/projects/insight-os-doc
ln -s ~/projects/insight-os-doc/product-spec .claude/skills/product-spec
```

Until you do, `/product-spec` will not appear in the skills list, and references
to it from `/testing-and-ci` and `/dod-and-git-workflow` will not resolve.
Never `git add -f` it back into this repo.
