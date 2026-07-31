# Migrate Insight OS from PrimeVue 4 to Nuxt UI 4.10

> **Status:** in flight, started 2026-07-30. **Landed:** PR 0 (#25), PR 1 (#26), PR 2 (#29),
> PR 3 (this one). **Remaining:** PRs 4–7. Until PR 7 merges, the skills describe Nuxt UI while
> parts of the code still run PrimeVue — that gap is deliberate and tracked here, not an
> inconsistency to "fix".
>
> **Decision record.** Written before implementation and kept as the reference each PR is
> reviewed against. PR 7 appends what actually shipped.

## Context

Day 1 shipped the app shell, Login, and Dashboard on PrimeVue 4 — 15 PrimeVue components
across 28 call sites in 11 files. Everything expensive is still unbuilt: 7 of 10 modules are
15-line stubs, and **no DataTable exists anywhere**.

Research into the current state of both frameworks turned up three facts that invalidate the
PrimeVue 4 pin:

1. **`primefaces/primevue` is archived** (`archived: true`, last push 2026-06-28). v4 stays MIT
   forever but is frozen — no bug fixes, no security patches, no future Vue/Nuxt compat work.
   PrimeVue 5 has **no public repository** (`npm view primevue@5.0.0 repository` → `{}`); issues
   route to a support portal.
2. **PrimeVue 5 moves `Chart` to the paid PrimeUI PRO tier.** The original reason for pinning to
   v4 has inverted — v5's free tier has no chart wrapper. Our own `BaseChart.vue` already covers it.
3. **The v5 Community license is narrower than "small projects":** all four of <$1M revenue,
   <5 developers (4 seats max), <10 employees, and never >$3M outside capital — re-confirmed
   every 12 months. Insight OS is intended as a growing commercial SaaS, so all four are
   tripwires on the success path. Beyond any one: $599/dev (→$799 in 2027).

Nuxt UI 4.10 is MIT with Nuxt UI Pro merged in free, actively developed (`nuxt/ui` pushed
2026-07-29), and its peers match ours exactly: `tailwindcss ^4` (we have 4.3.3),
`typescript ^5.6.3 || ^6` (we're pinned to TS 6), `vue-router ^4.5 || ^5` (we have 5.2).

**Intended outcome:** PrimeVue fully removed; all UI on Nuxt UI; the custom token set and its
skill retired entirely in favour of Nuxt UI's `--ui-*` plus Tailwind's theme vars, with the visual
identity declared once in `app.config.ts` (emerald/slate, unchanged); a reusable server-paginated
table wrapper in place before the table-heavy modules are built.

**Why now:** migration cost is at its lifetime minimum. 9+ tables and ~28 tab panels are ahead
of us; every module built on PrimeVue raises the price.

### The custom token set is retired, not bridged

Audit of `app/`: **zero** Tailwind utility classes, **zero** `tailwindcss-primeui` bridged
classes, **zero** `--p-*` references. All **53** style references read `var(--token)` from
[tokens.css](../../app/assets/css/tokens.css) inside scoped BEM, and they are concentrated —
`--text` ×10, `--sub` ×8, `--radius-card` ×8, `--card` ×7, `--border` ×7. The entire PrimeVue
theme surface is [insight-preset.ts](../../app/theme/insight-preset.ts) — ~15 lines of real content
(primary=emerald, surface=slate), whose `dark.surface` ramp is currently a byte-identical copy
of `light.surface` including `0: '#ffffff'`, so it isn't even functioning.

`tokens.css` is therefore not a design system — it is the Aura primitives resolved by hand.
Nuxt UI generates the same values from the same Tailwind palette, so **we adopt `--ui-*`
directly and delete our parallel vocabulary** rather than bridging one into the other. A bridge
would leave every future component styled against a private vocabulary that Nuxt UI's own
internals don't honor, guaranteeing drift the moment either side changes.

Auditing the remaining sections one by one, **all 46 properties resolve to something upstream or
to dead code**, so `tokens.css` and the `insight-os-design-tokens` skill are deleted outright:

| section | disposition |
|---|---|
| Surfaces, text, semantic (22) | → Nuxt UI `--ui-*`, generated from `app.config.ts` |
| Typography (2) | → Tailwind `--font-sans`. **The declared fonts were never loaded** — no `@font-face`, no `@nuxt/fonts`, no stylesheet link anywhere; the app has rendered system-ui all along. Dropping the token is a no-op. |
| Radii (5) | → Tailwind `--radius-sm/md/lg/xl` + `--ui-radius` |
| Elevation (1) | → Tailwind `--shadow-sm/md/lg` |
| Focus (2) | → Nuxt UI's focus utilities; one 4-line `:focus-visible` base rule survives in `main.css` |
| Chart ramp (14) | → a 4-entry TypeScript map (below) |
| Motion (4 keyframes + guard) | → **entirely dead** (below) |

Verified in `node_modules/tailwindcss/theme.css`: `--font-sans` (L2), `--radius-*` (L398-401),
`--shadow-*` (L408-410), `--leading-normal` (L393). Note these come from **Tailwind**, not Nuxt
UI — Nuxt UI adds only `--ui-radius`, `--ui-container`, `--ui-header-height` on top of color, and
defines no typography, shadow or focus variables at all. The replacement vocabulary is therefore
"`--ui-*` **plus** Tailwind theme vars", which is how the docs must word it.

### Motion: dead code, and the guard is actively harmful

None of `sh`, `fadeUp`, `blink`, `spin` are used — `grep` for `animation:` across `app/**/*.vue`
returns nothing outside `assets/css`. They arrived with the prototype and were never wired up.

The guard is worse than useless going forward:

```css
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

That `* !important` would **override Nuxt UI's own `motion-reduce:` handling**, which is more
nuanced — `ChatShimmer` degrades to static muted text, `Progress` and `Table` loading to a pulse.
Blanket-killing every animation is a strictly worse a11y outcome than what Nuxt UI ships. This is
a deletion with an upside.

The reduced-motion handling that *does* matter is
[chartjs.client.ts:36-38](../../app/plugins/chartjs.client.ts#L36-L38) (`Chart.defaults.animation = false`).
That is JS, unrelated to the tokens, and stays.

### Chart colors: 14 CSS tokens → a 4-entry TypeScript map

The ramp is almost entirely unreachable. `colorIndex` is never passed by any caller, so
[Sparkline](../../app/components/charts/Sparkline.vue#L26) always resolves `--chart-0`;
`chartTokenForMarket()` ([markets.ts:37](../../app/constants/markets.ts#L37)) has **zero callers**; and
only indices 0–3 are addressable through `colorForMarket`. Fourteen tokens exist to serve four
colors.

**Chart.js's built-in `Colors` plugin was considered and rejected.** Reading
`plugin.colors` in `chart.js@4.5.1`: `getColorizer` assigns by *dataset index* via a running
counter, so a market's color changes with how many series a chart happens to show — a chart of
JP+DE gives JP blue, a chart of all four gives JP red. That contradicts the one-color-per-market
rule at [markets.ts:26-28](../../app/constants/markets.ts#L26-L28), which is load-bearing in a
four-market comparison product. Its palette is also 7 hardcoded theme-blind values
(`rgb(54,162,235)`, `rgb(255,99,132)`, …) with no relationship to emerald/slate, and it
self-disables anyway — `containsColorsDefinitions` returns early when a dataset already sets
`borderColor`, which ours all do.

Instead the colors move **out of CSS into TypeScript**, which is what finally lets `tokens.css`
go. The only reason `useChartTheme` does a `getComputedStyle` round-trip is that the values lived
in CSS; Chart.js needs JS strings regardless. Hex is retained deliberately — `withAlpha()`
([useChartTheme.ts:11-18](../../app/composables/useChartTheme.ts#L11-L18)) parses hex only, and its L8
comment records why `color-mix()` can't replace it. Nuxt UI's tokens are `oklch()`, which
`withAlpha` would pass through **unfaded and silently**, turning every area fill solid.

In [markets.ts](../../app/constants/markets.ts), replacing `MARKET_CHART_INDEX` and the dead
`chartTokenForMarket`:

```ts
/** One fixed color per market, app-wide (charts, tags, legends). Hex, not oklch:
 *  Chart.js's withAlpha() parses hex only — canvas fillStyle won't take color-mix(). */
export const MARKET_COLOR: Record<MarketCode, { light: string; dark: string }> = {
  US: { light: '#0284c7', dark: '#38bdf8' }, // sky-600 / sky-400
  JP: { light: '#d97706', dark: '#fbbf24' }, // amber-600 / amber-400
  TW: { light: '#7c3aed', dark: '#a78bfa' }, // violet-600 / violet-400
  DE: { light: '#0d9488', dark: '#2dd4bf' }, // teal-600 / teal-400
}
```

Chart chrome (`grid`, `text`, `surface`, `positive`, `negative`) becomes a matching `CHART_CHROME`
constant in [useChartTheme.ts](../../app/composables/useChartTheme.ts), also hex, its light/dark values
taken from the same slate/emerald/red steps Nuxt UI resolves — deliberately *not* read back out of
`--ui-*`, both to avoid oklch reaching Chart.js's internal color parser and to keep the composable
free of DOM access.

`useChartTheme` then collapses to a `computed` off `isDark`: the `onMounted` snapshot, the `watch`,
the `nextTick` workaround for the class landing late ([L28-29](../../app/composables/useChartTheme.ts#L28-L29),
[L54-61](../../app/composables/useChartTheme.ts#L54-L61)) and every `getComputedStyle` call all disappear,
and the composable becomes SSR-safe. `colorForMarket` / `colorAt` keep their signatures so
`TrendLineChart` and `Sparkline` need no changes beyond imports.

---

## Approach

**Docs and skills land first, in their own PR, before any code changes.** The skills *are* the
mandate every later PR is written against, so correcting them first means no PR is ever
implemented against instructions known to be wrong. It also keeps the review honest: PR 0 is a
pure prose diff that can be read on its own merits, instead of being buried under a package.json
and 11 component rewrites.

Then the foundation PR with both libraries coexisting, then per-area PRs, then removal. Each PR is
independently green on CI per `/dod-and-git-workflow`.

*Accepted consequence:* between PR 0 and PR 7 the skills describe Nuxt UI while the code still
runs PrimeVue. PR 0 mitigates this by marking the migration in-flight and pointing at the plan
doc, so a session landing mid-migration sees the target state and the current state, not a
silent contradiction.

### Component mapping

| PrimeVue | Nuxt UI | Sites |
|---|---|---|
| `Button` | `UButton` | 9 |
| `Skeleton` | `USkeleton` | 4 |
| `InputText` | `UInput` | 2 |
| `SelectButton` | `URadioGroup` (login, form-bound) · `UTabs` (market filter) | 2 |
| `Toast` + `$toast` | `UApp` + `useToast()` behind `useNotify()` | 1 |
| `Menu` (popup) | `UDropdownMenu` — `command` → `onSelect`, `separator` → `[[…]]` groups | 1 |
| `Avatar` | `UAvatar` | 1 |
| `OverlayBadge` | `UChip` | 1 |
| `IconField` + `InputIcon` | `UInput :icon` | 2 |
| `Tag` | `UBadge` | 1 |
| `Select` | `USelect` | 1 |
| `Drawer` | `UDrawer direction="left"` | 1 |
| `Message` | `UAlert` | 1 |
| `Password` | `UInput type="password"` + `#trailing` reveal toggle | 1 |
| `EmptyState` (custom) | `UEmpty` | 1 |
| `pi pi-*` (15+ sites) | `i-lucide-*` via `@nuxt/icon` | — |

### Token replacement

The visual identity is declared once, in `app/app.config.ts`. Nuxt UI generates the full 50–950
ramps and every `--ui-*` alias from it — which is exactly what our hand-resolved tokens already
were:

```ts
export default defineAppConfig({
  ui: { colors: { primary: 'emerald', neutral: 'slate' } },
})
```

**Token mapping** for the 53 BEM references (`--radius-*` and `--shadow` come from Tailwind v4's
own `@theme`, not from Nuxt UI):

| ours | replacement | refs |
|---|---|---|
| `--text` | `--ui-text-highlighted` | 10 |
| `--sub` | `--ui-text-muted` | 8 |
| `--radius-card` | `--radius-lg` | 8 |
| `--card` | `--ui-bg` | 7 |
| `--border` | `--ui-border` | 7 |
| `--faint` | `--ui-text-dimmed` | 6 |
| `--shadow` | `--shadow-sm` | 5 |
| `--prim-ink` / `--prim-soft` | `--ui-color-primary-600` / `-50` | 3 |
| `--danger` / `--danger-ink` | `--ui-error` / `--ui-color-error-600` | 3 |
| `--bg` | `--ui-bg-muted` | 2 |
| `--hover` | `--ui-bg-elevated` | 1 |
| `--radius-control` | `--ui-radius` | 1 |
| `--violet` | `--color-violet-500` (Tailwind) | 1 |

Dark mode needs no second block: `--ui-*` re-declares itself under `.dark`, which our existing
cookie-driven class already toggles.

### Files deleted

- `app/assets/css/tokens.css` (170 lines) — nothing survives except a 4-line `:focus-visible`
  base rule and the `body` background/color, which fold into `main.css` as Tailwind utilities.
- `.claude/skills/insight-os-design-tokens/` in full — `SKILL.md`, `tokens.css`, `tokens.json`.
- `app/theme/insight-preset.ts` (in PR 7, with the rest of PrimeVue).

Two facts the skill carried are still true and still non-obvious, so they move into code comments
beside what they constrain rather than into another doc:

1. **One fixed color per market, app-wide** → the `MARKET_COLOR` docblock in `markets.ts`.
2. **Chart.js needs hex, not oklch** → the `withAlpha` / `CHART_CHROME` comments in
   `useChartTheme.ts`. Without this recorded, a future session will quite reasonably "unify"
   those values back into `--ui-*` and silently reintroduce opaque area fills.

One line in `/stack-conventions` points at both.

---

## PR sequence

### PR 0 — `docs/nuxt-ui-migration`
Prose only. No `package.json`, no code, no CSS. This is the mandate every later PR is written
against.

**New `.claude/doc/`** — a tracked home for decision records (`.claude/` is already tracked;
only `skills/product-spec` is ignored). This plan lands there as
`.claude/doc/nuxt-ui-migration.md`, renamed from the generated plan filename, so the reasoning
survives outside a chat session and reviewers of PRs 1–7 have something to check each PR against.
Add a `.claude/doc/README.md` one-liner saying what the folder is for, so it doesn't accrete
scratch notes.

**Skill and spec edits:**
- `.claude/skills/stack-conventions/SKILL.md`: replace L38-50 (the "most fragile part of the
  stack" PrimeVue/Tailwind section) with the Nuxt UI token model; L49 ("prefer PrimeVue
  components"); L101-102 (DataTable → `UTable`/TanStack); L121. Add the one line pointing at the
  two code comments that replace the deleted tokens skill.
- **Delete `.claude/skills/insight-os-design-tokens/` entirely** (`SKILL.md`, `tokens.css`,
  `tokens.json`) and remove it from the skills list in `.claude/CLAUDE.md`.
- `.claude/CLAUDE.md`: the stack line; and the **color hard rule**, which currently reads "Use
  design tokens — `var(--…)` or `tailwindcss-primeui` classes". Restate as: Nuxt UI `--ui-*`
  semantic tokens and Tailwind utilities; no raw hex outside `MARKET_COLOR` / `CHART_CHROME`.
- `product-spec/spec.md` (in `~/projects/insight-os-doc` — separate repo, separate commit; never
  `git add -f` it here): L6 stack line; **L32-33 — "tokens.css is the single source of truth for
  color styling" is now false and must say `app.config.ts` + Nuxt UI's `--ui-*` + Tailwind theme
  vars**; L125 (`exportCSV()` → our wrapper's export); L220 ("PrimeVue `Drawer`" → "a Drawer
  overlay"); L232 ("PrimeVue `Skeleton`" → "Skeleton"); L233 (`#empty` slot — still accurate for
  `UTable`); L234 (`useToast` → `useNotify()`).
- `TODO.md` decision log: replace the "PrimeVue pinned to v4" rationale with this decision and its
  evidence.
- `.github/dependabot.yml`: drop the `primevue` / `@primevue/nuxt-module` / `@primeuix/themes`
  major-version ignores — moot once removed.

Each edited skill gets a short "migration in flight — see `.claude/doc/nuxt-ui-migration.md`"
note, removed in PR 7 when the code and the docs agree again.

*Verification is a read-through plus the pre-commit hook: `pnpm lint` is `eslint .` and does not
cover markdown, but `.lintstagedrc.json` runs `prettier --write` over `*.md`, so formatting is
handled on commit. The real check is that `/stack-conventions` and `/insight-os-design-tokens` no
longer contradict the plan — and that the second of those is gone.*

### PR 1 — `chore/nuxt-ui-foundation`
Both libraries installed; nothing swapped yet.

- Add `@nuxt/ui@^4.10.0`, `@iconify-json/lucide`. Keep PrimeVue.
- [nuxt.config.ts](../../nuxt.config.ts): add `'@nuxt/ui'` to `modules`; `ui: { colorMode: false }` —
  our cookie-based [useTheme.ts](../../app/composables/useTheme.ts) stays the sole owner of dark mode
  (`@nuxtjs/color-mode` defaults to localStorage, which the spec forbids); `icon: { clientBundle: { scan: true } }`.
- **Remove `@tailwindcss/vite` from `vite.plugins`** — `@nuxt/ui` registers the Tailwind Vite
  plugin itself. Verify utilities still compile in `pnpm dev`; restore only if they don't.
- [main.css](../../app/assets/css/main.css): add `@import '@nuxt/ui'` and an explicit
  `@custom-variant dark (&:where(.dark, .dark *));`. Retain the
  `@layer tailwind-base, primevue, tailwind-utilities` declaration so PrimeVue keeps working
  during coexistence. Fold in the two surviving base rules (`body` background/text,
  `:focus-visible`) and drop the `@import './tokens.css'` line.
- New `app/app.config.ts` with the colors map — this is now the single declaration of the visual
  identity.
- **The token retirement is atomic and lands here**, not spread across PRs 2–5. Splitting it would
  leave `tokens.css` half-deleted across several merges, with each per-area PR guessing which
  vocabulary is current. Concretely:
  - delete `app/assets/css/tokens.css` and `.claude/skills/insight-os-design-tokens/`;
  - rewrite the 53 `var(--token)` references per the mapping table;
  - add `MARKET_COLOR` to `markets.ts`, removing `MARKET_CHART_INDEX` and the dead
    `chartTokenForMarket`;
  - rewrite `useChartTheme.ts` around `CHART_CHROME` + a `computed` off `isDark`, deleting
    `snapshot()`, `readToken()`, the `onMounted`/`watch` pair and the `nextTick` workaround.
    `colorForMarket` / `colorAt` keep their signatures, so `TrendLineChart` and `Sparkline`
    change only their imports.

  *This is the highest-risk step in the migration and the reason PR 1 needs a real review: it
  changes how every existing surface is colored while PrimeVue components are still rendering.*
- [app.vue](../../app/app.vue): wrap in `<UApp :locale="locales[locale]">` using
  `import * as locales from '@nuxt/ui/locale'` (zh-TW ships built in). Keep `<Toast>` until PR 3.
- **New `app/composables/useNotify.ts`** — the seam that removes the
  `globalProperties.$toast` reach-in. Wraps `useToast().add({ title, description, color: 'error' })`.
- [plugins/vue-query.ts:31-43](../../app/plugins/vue-query.ts#L31-L43): `notifyError` calls
  `nuxt.runWithContext(() => useNotify().error(errorKey(error)))`. This deletes the single most
  brittle line in the repo and was worth doing regardless of framework.
*Accepted temporary condition:* during PRs 2–5 both libraries' CSS is loaded and PrimeVue visuals
may drift at the edges. It resolves at PR 7 and affects no shipped surface.

### PR 2 — `refactor/shell-nuxt-ui`
[Topbar.vue](../../app/components/shell/Topbar.vue) is the densest file (7 components, 10 sites): the
`Menu :model` array at L17-41 becomes `UDropdownMenu` items (`command` → `onSelect`,
`{ separator: true }` → nested group arrays), and the
`Button`>`Avatar`-in-`OverlayBadge`-in-`NuxtLink` nesting flattens to `UChip` + `UButton`.
Also [layouts/default.vue:26-33](../../app/layouts/default.vue#L26-L33) `Drawer` → `UDrawer`,
[navigation.ts](../../app/constants/navigation.ts) icons → `i-lucide-*`, `ThemeToggle`,
`LanguageSwitcher`, and `Sidebar` icons.

### PR 3 — `refactor/login-nuxt-ui`
[login.vue](../../app/pages/login.vue): `Message`→`UAlert`, `InputText`→`UInput`,
`Password`→`UInput type="password"`, `SelectButton`→`URadioGroup`, `Button`→`UButton`. Drop
`<Toast>` from `app.vue` in favour of `UApp`. Keep the hand-rolled `computed` validation as-is —
porting to `UForm` + zod is a separate, optional change, not part of this migration.
Update the 4 affected [smoke.test.ts](../../test/e2e/smoke.test.ts) selectors: L17/38/57
`getByLabel('Password', { exact: true })`, L40 `getByRole('button', { name: 'Viewer' })` →
`getByRole('radio', …)`, L65 `getByRole('combobox')`.

### PR 4 — `refactor/dashboard-nuxt-ui`
`Skeleton`→`USkeleton` in [index.vue](../../app/pages/index.vue) and
[RevenueTrend.vue](../../app/components/dashboard/RevenueTrend.vue); `Tag`→`UBadge` in
[AnomalyAlerts.vue](../../app/components/dashboard/AnomalyAlerts.vue) (keep the existing
`warning→'warn'` severity map, retargeted to `UBadge` colors); `Button`→`UButton` in
`AnomalyAlerts`, `AiSummaryCard`, `ErrorState`; market-filter `SelectButton`→`UTabs`.
[KpiCard.test.ts](../../test/nuxt/KpiCard.test.ts) asserts only text and BEM classes, so it should
pass untouched — a signal the swap is behaving.

### PR 5 — `refactor/empty-states-nuxt-ui`
`EmptyState`→`UEmpty`; the `pi pi-wrench` icons across the 8 stub pages.

### PR 6 — `feat/data-table-wrapper`
The de-risking step, delivered as a reusable asset rather than a throwaway spike. New
`app/components/common/DataTable.vue`: a thin `UTable` wrapper bound to the existing
`ApiListResponse<T>` / `ListQuery` contract in [types/api.ts](../../app/types/api.ts), reusing
`okList()` from [server/utils/mock/respond.ts](../../server/utils/mock/respond.ts).

Must cover, because these are explicit spec requirements: manual (server) sorting and pagination
via `manualSorting` / `manualPagination` / `rowCount` passed through `:pagination-options`;
`column-pinning` for the "sticky first columns on smaller viewports" rule (needs explicit column
`size` values); `loading`; `#empty`; and CSV export gated on `can('export:csv')` with the
*disabled-plus-tooltip* treatment already encoded in
[permissions.ts](../../app/constants/permissions.ts) `DENIED_TREATMENT` — a tooltip on a disabled
control needs a wrapper element to receive pointer events.

Sorting must delegate to the server on the raw numeric field: money cells render per-record from
`nativeCurrency`, and the spec is explicit that mixed-currency sorting is currency-blind with no
cross-currency normalization in the MVP. No client-side coercion of formatted currency strings.

Land this against one real endpoint (Customers list is the natural first) so the contract is
exercised end to end.

### PR 7 — `chore/drop-primevue`
Remove `primevue`, `@primevue/nuxt-module`, `@primeuix/themes`, `tailwindcss-primeui`,
`primeicons`. Delete [app/theme/insight-preset.ts](../../app/theme/insight-preset.ts). Drop the
`primevue` block from [nuxt.config.ts:30-47](../../nuxt.config.ts#L30-L47) and `primeicons/primeicons.css`
from `css`. Reduce `main.css` to its final form — the three-layer declaration goes away entirely,
since it existed only to let Tailwind utilities override PrimeVue:

```css
@import 'tailwindcss';
@import '@nuxt/ui';
@custom-variant dark (&:where(.dark, .dark *));
```

That is the whole CSS entry. No `tokens.css`, no layer ordering, no bridge — the three-layer
declaration existed only to let Tailwind utilities override PrimeVue.

Finally, drop the "migration in flight" notes PR 0 added to the skills, and append the outcome to
`.claude/doc/nuxt-ui-migration.md` so the record shows what actually shipped rather than only what
was intended.

---

## Verification

Per PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, plus the DoD click-through in
the Vercel preview in **light + dark × en + zh-TW**.

Targeted checks, ordered by risk:

1. **FOUC regression** (highest risk — we're rewriting the CSS entry). Set the `insight-theme=dark`
   cookie, hard-reload: no light flash, `<html>` carries `.dark` in the SSR response
   (`curl -s localhost:3000 --cookie 'insight-theme=dark' | grep -o 'class="[^"]*dark'`).
2. **No orphaned token references** — after PR 1,
   `grep -rn 'var(--' app/ --include='*.vue'` returns only `--ui-*` and Tailwind `@theme` vars.
   A stale `var(--card)` fails silently to `initial` rather than erroring, so this grep is the
   only thing standing between us and an invisible regression. Spot-check a `UButton` in DevTools:
   `--ui-primary` resolves to the emerald ramp in both schemes, no `--p-*` in computed styles.
3. **Escape / focus return** on `UDrawer` (spec L240): Escape closes and focus returns to the
   trigger button.
4. **zh-TW overflow** on the shell and login at 768px and 1024px — no clipping, no horizontal
   scroll (part of "done" per `/i18n-workflow`).
5. **Reduced motion** — with `prefers-reduced-motion: reduce`, chart animation is still off via
   [chartjs.client.ts:36-38](../../app/plugins/chartjs.client.ts#L36-L38), and Nuxt UI's own components
   degrade per their documented behaviour (skeleton/progress pulse rather than freeze) now that
   the blanket `* { animation: none !important }` guard is gone.
6. **RBAC unchanged** — sign in as Viewer: Team nav absent, `/team` redirects home. `pnpm test:e2e`
   green after PR 3.
7. **PrimeVue fully gone** after PR 7: `pnpm build && grep -ri primevue .output/ | head` returns
   nothing, and `pnpm why primevue` fails to resolve.
8. **Chart area fills** — the specific failure mode the hex `MARKET_COLOR` map exists to prevent.
   On the Dashboard revenue trend, confirm the fill under the line is *translucent*, not solid, in
   both schemes. A solid fill means `withAlpha()` received a non-hex value and passed it through.
   Also confirm each market keeps its color when the market filter changes the series count —
   the property the Chart.js `Colors` plugin cannot provide.
   `BaseChart.vue`, `TrendLineChart` and `Sparkline` change only their imports — they have zero
   PrimeVue coupling; the rewrite is confined to `useChartTheme.ts` and `markets.ts`.
9. **Chart colors survive SSR** — the rewritten `useChartTheme` no longer reads the DOM, so a
   hard reload with `insight-theme=dark` should paint charts in dark colors on first frame
   rather than flipping after hydration (the `nextTick` workaround it replaces).

---

## Open items (flagging, not fixing)

- **Pre-existing spec conflict, unrelated to this migration:** Settings→General specifies a
  "default currency" setting while spec.md:46/121 insist the currency selector is Analytics-only.
  The spec never reconciles these. Needs a product decision; I have not changed either statement.
- Nuxt UI's docs have no worked example of server-side pagination, though the full TanStack option
  set passes through `:pagination-options`. PR 6 exists to prove this out before any module depends
  on it.
- Nuxt UI's major cadence is fast (v3→v4 inside a year). MIT with a public repo, so a future major
  is a migration, never a licensing event.
- **Typography is now Tailwind's system stack**, matching what actually renders today. If the
  Figtree + Noto Sans TC look is wanted later it is a deliberate, separate change (`@nuxt/fonts`,
  self-hosted, with a zh-TW subsetting check) — not something to reintroduce as a bare CSS
  variable that names fonts nobody loads.
- Chart colors are now sky/amber/violet/teal rather than the inherited PrimeUI pastels, so the
  Dashboard trend and sparklines will look different by design. Worth a look in the PR 1 preview
  before the Analytics module builds on them.
- I'll record the commercial-SaaS trajectory and this framework decision to project memory, since
  both are inputs no future session can derive from the code.
