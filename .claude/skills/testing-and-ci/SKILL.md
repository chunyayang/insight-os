---
name: testing-and-ci
description: Testing stack and CI pipeline for the Insight OS analytics platform — Vitest + @nuxt/test-utils + @vue/test-utils for unit/component/Nuxt-runtime tests, Playwright for an E2E smoke, and a single GitHub Actions CI workflow (pnpm + Node 24) that lints, type-checks, tests, and builds every PR. Deployment is owned by Vercel, not CI. ALWAYS consult this skill when writing or editing any test, adding or changing vitest.config / playwright.config, deciding what to test for a new feature, adding a test script, or touching anything under .github/workflows/. This is an MVP — test the risky logic, not everything.
---

# Insight OS — Testing & CI

The testing bar for the MVP is **deliberately minimal**: cover the logic that is
expensive to get wrong (money formatting, RBAC, cross-market mapping) plus one
end-to-end happy path — not a coverage target. Verify installed versions in
`package.json` before relying on version-specific API; this skill targets
**Nuxt 4 + `@nuxt/test-utils` (Vitest projects API) + Node 24 + pnpm**.

## Test stack

- **Vitest** — the runner (Vite-native, matches Nuxt 4's build).
- **`@nuxt/test-utils`** — Nuxt runtime environment + helpers (`mountSuspended`,
  `renderSuspended`, `mockNuxtImport`, `registerEndpoint`, `mockComponent`).
- **`@vue/test-utils`** — component mounting (wrapped by `mountSuspended`).
- **`happy-dom`** — DOM implementation for the Nuxt/unit environments.
- **Playwright** (`@playwright/test` + `@nuxt/test-utils/playwright`) — the E2E smoke.

Install (dev deps):

```bash
pnpm add -D vitest @nuxt/test-utils @vue/test-utils happy-dom @playwright/test playwright-core
```

## Vitest configuration

Use **`vitest.config.mts`** (the `.mts` extension) so importing `@nuxt/test-utils`
works without forcing `"type": "module"` on the whole project — setting that at the
root would change how every other `.js` config (postcss, tailwind, commitlint) is
parsed. Do **not** add `"type": "module"` to `package.json` just for tests.

Use the **Vitest projects** API so fast Node unit tests and slow Nuxt-runtime tests
stay separated (mixing them is the most common source of flaky Nuxt tests):

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        // pure logic — runs in Node, fast
        test: { name: 'unit', include: ['test/unit/**/*.{test,spec}.ts'], environment: 'node' },
      },
      await defineVitestProject({
        // needs the Nuxt runtime (components, composables, auto-imports)
        test: { name: 'nuxt', include: ['test/nuxt/**/*.{test,spec}.ts'], environment: 'nuxt' },
      }),
    ],
  },
})
```

Optionally add `'@nuxt/test-utils/module'` to `modules` in `nuxt.config.ts` — it
wires a Vitest panel into Nuxt DevTools. Not required for CI.

## Test layout

```text
test/
├── unit/     # pure functions, no Nuxt runtime (Node env) — formatters, permission map, mappers
├── nuxt/     # components & composables needing auto-imports / plugins (Nuxt env)
└── e2e/      # Playwright smoke (separate — never import /runtime and /e2e in one file)
```

- Node unit files must **not** rely on auto-imports or composables — import from source.
- Nuxt-env and E2E helpers can't co-exist in one file: `@nuxt/test-utils/runtime`
  and `@nuxt/test-utils/e2e` need different environments.

## What to test for the MVP (in priority order)

1. **Money formatting (`composables/useFormat.ts`)** — highest value. Assert
   JPY renders **0 decimals**, USD/TWD/EUR render correctly per market. Formatting
   is the one client-side money rule (conversion is server-side — see
   `mock-api-contract`), so it must be correct.
2. **Permission map (`app/constants/permissions.ts` + `useCan()`)** — table-driven
   test: for each ability, which roles pass. RBAC is a security-shaped rule; a
   regression here is a real bug, not cosmetic. See `stack-conventions` (Roles).
3. **Market → chart-index map (`app/constants/markets.ts`)** — each market maps to
   one stable `--chart-*` index; assert the mapping is total and unique.
4. **A couple of component smoke tests** — mount a KPI card / a chart wrapper with
   `mountSuspended` (or `renderSuspended` + Testing Library) and assert it renders
   with sample data and its empty state renders with none.
5. **One E2E happy path** — login → dashboard loads → an anomaly alert is visible.

Explicitly **out of scope for the MVP**: chasing a coverage %, snapshotting every
component, testing Nuxt UI internals, and exhaustive E2E flows.

## Helpers worth knowing

- `mountSuspended(Comp, { route })` — mount a component in the Nuxt env (async setup,
  plugin injections). Wraps `@vue/test-utils` `mount`.
- `renderSuspended(Comp)` — same, via Testing Library (`screen`, `fireEvent`);
  needs Vitest `globals: true`.
- `registerEndpoint('/api/…', () => ({...}))` — stub a Nitro endpoint so a component
  test gets deterministic data. Keep stub shapes identical to `mock-api-contract`.
- `mockNuxtImport('useState', …)` — mock an auto-imported composable (once per import
  per file; it's a hoisted `vi.mock` macro).

## Package scripts

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "typecheck": "nuxt typecheck",
  "lint": "eslint .",
  "build": "nuxt build"
}
```

`nuxt typecheck` needs `vue-tsc` + `typescript` installed. `eslint .` assumes the
project's flat config (e.g. via `@nuxt/eslint`).

## Playwright E2E (scaffolded, not yet a required gate)

Set it up so the muscle exists, but keep it **out of the blocking CI gate** for the
MVP — a browser build + run is slow, and one smoke test isn't worth gating merges on
yet. Promote it to required once the suite is meaningful.

```ts
// playwright.config.ts
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  use: { nuxt: { rootDir: fileURLToPath(new URL('.', import.meta.url)) } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

```ts
// test/e2e/smoke.test.ts
import { expect, test } from '@nuxt/test-utils/playwright'

test('dashboard loads after login', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByRole('heading')).toBeVisible()
})
```

Import `test`/`expect` from `@nuxt/test-utils/playwright` (not bare
`@playwright/test`) so the Nuxt server is booted for you.

## CI — GitHub Actions (single workflow)

One workflow, runs on push to `main` and on every PR targeting `main`. It is the
**real quality gate** — local Husky hooks are convenience, this is enforcement
(see `dod-and-git-workflow`). CI **does not deploy** — Vercel does (below).

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4          # must come BEFORE setup-node
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile  # fails if lockfile is out of sync
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test                       # unit + nuxt projects
      - run: pnpm build
```

Notes:
- `pnpm/action-setup` **before** `actions/setup-node`, or `cache: 'pnpm'` can't
  find pnpm. It reads the pnpm version from the `packageManager` field in
  `package.json` — set that field (e.g. `"packageManager": "pnpm@<version>"`).
- `--frozen-lockfile` makes CI fail loudly when `pnpm-lock.yaml` drifts from
  `package.json` instead of silently rewriting it. Commit `pnpm-lock.yaml`.
- GitHub Action **major versions bump periodically** — check the Marketplace and
  pin to the current major rather than assuming these forever.
- Make this workflow a **required status check** on the `main` branch protection
  rule so a red build blocks merge.

## Deployment — owned by Vercel, not CI

Do **not** script deploys in GitHub Actions. Vercel's Git integration handles it:

- Every PR gets an **ephemeral preview deployment** (unique URL) — this replaces a
  staging branch/environment for review. See `dod-and-git-workflow`.
- Merging to `main` triggers the **production** deploy automatically.
- Environment variables and secrets live in the **Vercel project dashboard**, never
  in the repo. Rollback is a one-click promote of a previous deployment in Vercel.

Keeping CI (correctness) and Vercel (delivery) separate is the whole point — don't
merge them.

## Related skills
`stack-conventions` · `mock-api-contract` · `dod-and-git-workflow` · `product-spec`.
