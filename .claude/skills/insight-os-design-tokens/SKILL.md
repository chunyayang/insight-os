---
name: insight-os-design-tokens
description: >-
  Design tokens for the Insight OS analytics SaaS prototype — color (light +
  dark), typography, chart palette, radii, elevation, and motion. Load this
  whenever building, extending, or theming any Insight OS UI so new work matches
  the existing look. Tokens are exposed as CSS custom properties on :root (light)
  and .dark (dark mode); tokens.css is drop-in and tokens.json is the
  machine-readable source of truth.
---

# Insight OS — Design Tokens

Single source of truth for the visual language of the Insight OS prototype.
Everything is a CSS custom property; components read `var(--token)` and never
hard-code hex. Dark mode is a class (`.dark` / `body.dark`) that re-declares the
same variable names — so component CSS is written once and themes automatically.

## Files
- `tokens.css` — paste into the app head (or `@import`). Declares every token on
  `:root` and overrides them under `.dark`. This is the drop-in artifact.
- `tokens.json` — structured token map (light + dark values) for tooling,
  Figma sync, or generating other formats.

## How to use
1. Include `tokens.css` once, globally.
2. Reference tokens only via `var(--…)`. Example:
   ```css
   .card { background: var(--card); border: 1px solid var(--border);
           border-radius: 14px; box-shadow: var(--shadow); }
   ```
3. Toggle dark mode by adding/removing `dark` on `<body>` (or `<html>`).
4. Never introduce a new raw hex. If a needed color is missing, add it as a
   token here (light + dark) first, then use it.

## Provenance & how to consume (read this first)
- **Base preset:** PrimeVue **Aura** — primary `emerald`, surface `slate`. The hex values here are already resolved from Aura primitives; use them as-is.
- **`aura` field (in tokens.json) is provenance only** — it names the Aura step a value came from (e.g. `primary.500`, `surface.200`) so you can regenerate if the preset/primary changes. Don't re-resolve it at build time.
- **`-ink` / `-soft` are derived ROLE tokens, not Aura primitives.** `-ink` = accessible text/icon on the matching `-soft` (an Aura `.700`-ish step); `-soft` = the tinted chip fill (Aura `.50` in light, low-alpha base in dark). There is no Aura token literally named `*-ink`/`*-soft`.
- **Chart palette maps to PrimeUI Charts, not Aura** — `--chart-0..13` are an exact 1:1 copy of the PrimeUI Charts default palette (`--p-chart-color-0..13`, both light+dark). They are a standalone categorical scale, NOT Aura primitive ramps. Use as-is for series; never remap to Aura semantic colors.
- **Known deviation:** `--warn` light is amber-600 (`#d97706`); Aura's `warn` message severity uses amber-500 (`#f59e0b`).

## Color system

**Surfaces & text** — `--bg` (app canvas), `--card` (raised surface),
`--border`, `--hover` / `--track` (fills), `--text` (primary),
`--sub` (secondary), `--faint` (tertiary/placeholder).

**Semantic families** — each has a base, an `-ink` (accessible text/foreground
on soft), and a `-soft` (tinted background chip):
- `--prim` — brand green; primary actions, positive/active state, focus ring.
- `--danger` — red; destructive, errors, "down" trend, critical severity.
- `--warn` — amber; warnings, medium severity.
- `--info` — blue; informational, neutral emphasis, "running" status.
- `--violet` — accent; secondary categorical emphasis (base + `-soft` only).

Semantic red/green **carry meaning** (status, severity, trend direction) — keep
them for those roles; do not repurpose them as decoration.

**Chart palette** — `--chart-0` … `--chart-13`, a 14-color categorical ramp for
data series (lines, bars, sparklines, legends). This is an exact 1:1 copy of the
**PrimeUI Charts default palette** (`--p-chart-color-0..13`), light and dark — a
standalone scale that pairs with Aura but is **not** built from Aura primitives.
Assign series by index, never by semantic color, and don't substitute Aura colors.

## Typography
- UI / Latin: **Figtree** (400, 500, 600, 700, 800).
- CJK fallback: **Noto Sans TC** (400, 500, 700) — the app ships EN + 繁體中文.
- Stack: `'Figtree','Noto Sans TC', system-ui, sans-serif`.
- Base `line-height: 1.5`; headings tighten to `letter-spacing: -.02em`,
  weight 800. Numeric readouts use `font-variant-numeric: tabular-nums`.
- Icons: **PrimeIcons 7.0.0** (`pi pi-*`).

## Radii (scale in use)
- 6–7px — chips, badges, small pills
- 8–10px — buttons, inputs, selects, menu items
- 9–11px — icon tiles
- 12–16px — cards / panels / modals
- 50% — avatars

## Elevation & focus
- `--shadow` — the standard raised-surface shadow (softer/darker in dark mode).
- Focus ring: `outline: 2px solid var(--prim); outline-offset: 2px`.

## Motion
Keyframes defined globally: `fadeUp` (enter, 8px rise), `sh` (skeleton shimmer),
`blink` (typing dots), `spin` (loaders). All motion is disabled under
`@media (prefers-reduced-motion: reduce)` — preserve that guard.

See `tokens.css` for the authoritative values and `tokens.json` for the parsed map.
