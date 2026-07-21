---
name: dod-and-git-workflow
description: Git branching model, commit conventions, local hooks, PR process, and the Definition of Done for the Insight OS analytics platform — trunk-based development on main with short-lived feature branches, Conventional Commits enforced by commitlint, Husky + lint-staged pre-commit hooks, and Vercel preview deploys per PR. ALWAYS consult this skill when creating a branch, naming a commit, opening or reviewing a PR, setting up Husky/commitlint/lint-staged, or judging whether a change is "done". The DoD checklist below is the merge bar — it folds in the project's i18n, color, RBAC, and state-boundary rules.
---

# Insight OS — Definition of Done & Git Workflow

Lightweight process for an MVP with a small team and Vercel-hosted deploys. The
goal is fast, safe iteration — not ceremony. Verify tool versions in `package.json`;
this skill targets **Husky v9 + commitlint (config-conventional) + lint-staged**,
with **pnpm** as the package manager.

## Branching model — trunk-based

One long-lived branch, always deployable:

- **`main`** — always releasable; **protected** (no direct pushes, PR + green CI
  required). Merging here triggers the Vercel **production** deploy.
- **Short-lived working branches**, branched from `main`, deleted after merge:
  - `feature/<short-slug>` — new functionality
  - `fix/<short-slug>` — bug fixes
  - `chore/<short-slug>` / `docs/<short-slug>` — tooling, deps, docs

**No long-lived `staging` branch.** For a Vercel-hosted frontend, a staging branch
would mean merging every change twice and constantly reconciling drift. Vercel's
**per-PR preview deployments** give the same "review before prod" benefit without
that tax — each PR gets its own URL to click through. If a *stable, bookmarkable*
staging URL is ever needed for the design team, get it by pointing a Vercel
preview at `main` rather than by adding a branch — but that's optional and not part
of the MVP.

Keep branches small and short-lived: one topic per branch, open a PR early, merge
within a day or two. Long branches are where merge pain and drift come from.

## Commit conventions — Conventional Commits

Every commit message follows **Conventional Commits**, enforced by commitlint:

```text
<type>(optional-scope): <subject>

feat(analytics): add currency selector to revenue tab
fix(dashboard): correct JPY KPI decimal rounding
chore(deps): bump @nuxt/test-utils
```

Allowed types (config-conventional): `feat`, `fix`, `docs`, `style`, `refactor`,
`perf`, `test`, `build`, `ci`, `chore`, `revert`.

For the MVP this is **for readability and a clean history only** — it is **not**
wired to automated releases or auto-tagging (that was deliberately dropped as
non-essential). The convention is cheap to keep now and makes adding release
automation later trivial if it's ever wanted.

## Local hooks — Husky + lint-staged + commitlint

Fast local feedback before code leaves the machine. Setup:

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional
pnpm exec husky init          # creates .husky/ and the prepare script
```

`.husky/pre-commit` — lint & format only the staged files (keep it fast):

```sh
pnpm exec lint-staged
```

`.husky/commit-msg` — validate the commit message:

```sh
pnpm exec commitlint --edit "$1"
```

`lint-staged` config (in `package.json` or `.lintstagedrc.json`):

```json
"lint-staged": {
  "*.{ts,vue}": ["eslint --fix", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"]
}
```

commitlint config — **use `commitlint.config.mjs`** with `export default` (or
`.cjs` with `module.exports`). A plain `.js` file breaks if the project is ever
ESM; `.mjs` is unambiguous:

```js
// commitlint.config.mjs
export default { extends: ['@commitlint/config-conventional'] }
```

**Caveat — hooks are convenience, not enforcement.** They run only locally and are
bypassable with `git commit --no-verify`. So the same lint/type/test checks are
mirrored in the CI workflow (see `testing-and-ci`), which is the actual gate.
Keep `pre-commit` to lint-staged only; don't run the full test suite there — push
slow checks to CI. This is why `feat:`/`fix:` discipline matters even though the
hook can be skipped: CI still runs.

## Pull request process

1. Branch from `main`, push, open a PR **into `main`** early.
2. Keep it small and single-topic; write a short description (what + why).
3. Self-review the diff first. CI (lint · typecheck · test · build) must be **green**.
4. Click through the **Vercel preview deployment** the PR auto-attaches — verify the
   change in both **light + dark** and both **locales (en + zh-TW)**.
5. At least one review approval before merge (solo → self-review is the substitute).
6. **Squash-merge** so `main` history stays one clean Conventional Commit per PR.
7. Delete the branch. Merge to `main` → Vercel deploys production automatically.

## Definition of Done

A change is **done** only when all of the following hold. Several items just point
at existing skills — the DoD is where those rules get enforced per change.

- [ ] **CI is green**: `lint`, `typecheck`, `test` (unit + nuxt), and `build` all pass.
- [ ] **Tests** exist for any new non-trivial logic (formatters, permission rules,
      mappers) — see `testing-and-ci`. UI-only tweaks don't need new tests.
- [ ] **i18n parity**: no hardcoded user-facing strings; every new key exists in
      **both** `en.json` and `zh-TW.json`; numbers/currency/dates go through
      `useFormat` (JPY = 0 decimals). See `i18n-workflow`.
- [ ] **Color**: no raw hex, no Tailwind palette colors — only design tokens
      (`var(--…)` / `tailwindcss-primeui` classes). See `insight-os-design-tokens`.
- [ ] **RBAC respected**: role-gated UI/routes use the central permission map +
      `useCan()`; *(Hidden)* means hidden, not disabled. See `product-spec` / `stack-conventions`.
- [ ] **State boundary**: server data via Vue Query, UI state via Pinia — never cloned.
- [ ] **States covered**: loading (skeleton), empty, and error states handled where
      the component fetches data.
- [ ] **Verified in the Vercel preview**: works in light + dark and en + zh-TW.
- [ ] **Accessibility floor**: icon-only buttons have localized `aria-label`;
      keyboard/focus behaviour intact. See `stack-conventions` (Accessibility).
- [ ] **Docs updated** if a convention changed — update the relevant skill or
      `CLAUDE.md`, don't let the rules drift from the code.
- [ ] **PR reviewed** (or self-reviewed) and **squash-merged** with a Conventional
      Commit title.

## Related skills
`testing-and-ci` · `stack-conventions` · `i18n-workflow` · `insight-os-design-tokens` · `product-spec`.
