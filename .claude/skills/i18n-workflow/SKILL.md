---
name: i18n-workflow
description: Translation key naming rules and the workflow for adding, changing, or removing user-facing strings in the Insight OS analytics platform (Nuxt 4 + @nuxtjs/i18n v10 / Vue I18n v11, locales en + zh-TW, no_prefix strategy). ALWAYS consult this skill whenever you write or edit any user-facing text, add a new component or page that renders labels/messages, wire up the language switcher, format numbers/currency/dates, or touch anything in i18n/locales/. Use it even when the task only incidentally introduces a string (a button label, a toast, an aria-label) — a hardcoded string is a bug in this project.
---

# Insight OS — i18n Workflow

Rules for internationalization. The app ships in **English (`en`)** and **Traditional Chinese (`zh-TW`)**, both first-class — neither is a second-tier afterthought. Verify the installed `@nuxtjs/i18n` version in package.json before relying on version-specific API; this skill targets **v10.x (Vue I18n v11)**.

## Configuration baseline (do not silently change)

- Module: `@nuxtjs/i18n` v10, configured under the `i18n` key in `nuxt.config.ts`.
- Locale files live in **`i18n/locales/`** (the module default `<rootDir>/i18n/locales`), one JSON per locale, referenced by the `file` property:

```ts
i18n: {
  strategy: 'no_prefix',        // internal tool: URL never changes with language
  defaultLocale: 'en',
  locales: [
    { code: 'en',    name: 'English', language: 'en-US', file: 'en.json' },
    { code: 'zh-TW', name: '繁體中文', language: 'zh-TW', file: 'zh-TW.json' },
  ],
  // lazy loading is on by default when `file` is used
}
```

- **`strategy: 'no_prefix'`** is intentional. URLs never carry a locale segment (`/dashboard` stays `/dashboard` in both languages). Do NOT add `useLocalePath`/`$localePath` wrappers around `<NuxtLink>` and do NOT introduce localized route names — those belong to prefix strategies for public SEO sites, which this is not. Plain `<NuxtLink to="/dashboard">` is correct here.
- Because there is no URL prefix, the chosen language is persisted in a **cookie** so it survives reload and is readable during SSR (prevents a wrong-language flash). Keep i18n's cookie-based detection enabled; do not reimplement persistence by hand.

## Translation key naming

Keys are **hierarchical and semantic**, never English sentences used as keys.

- Pattern: **`module.page.element`** (add a `state`/`variant` segment when needed).
  - `dashboard.kpi.revenue`
  - `analytics.funnel.stageAddToCart`
  - `team.members.inviteButton`
  - `campaigns.abtest.winnerBadge`
- Truly shared strings go under **`common.*`**: `common.actions.save`, `common.actions.cancel`, `common.status.active`, `common.empty.noData`.
- Validation / error messages: **`errors.<domain>.<case>`**, e.g. `errors.auth.invalidCredentials`, `errors.form.required`.
- Casing: dot-separated lowerCamelCase leaf keys. No spaces, no punctuation, no sentence-as-key.
- Keep the key describing the **role** of the string, not its current wording — if the copy changes from "Save" to "Save changes", the key `common.actions.save` stays.
- Mirror the module boundaries from the sidebar IA so keys are predictable: a translator or dev can guess the key from where the string appears.

## The golden rule: no hardcoded user-facing strings

Every string a user can see or hear (visible text, placeholders, `title`, `alt`, `aria-label`, toast messages, chart summaries) MUST come from a translation key. A literal like `<button>Save</button>` in a template is a defect.

- In templates: `{{ $t('common.actions.save') }}` or `:aria-label="t('common.actions.close')"`.
- In `<script setup>`: `const { t } = useI18n()` then `t('...')`.
- The only exceptions: developer-only console logs, code identifiers, and test IDs.

## Workflow for adding or changing a string

Follow this every time — it's short and non-negotiable:

1. Pick the key by the naming rules above (reuse `common.*` before inventing a new key).
2. Add the key to **BOTH** `i18n/locales/en.json` **and** `i18n/locales/zh-TW.json` in the **same commit**. A key present in one file but missing in the other is a bug, not a "translate later" TODO.
3. If the real zh-TW translation isn't ready, still add the key with a clearly marked draft value (e.g. prefix `【TODO】`) so the missing-key linter/reviewer catches it — never leave the key absent.
4. Keep both JSON files in the **same key order / structure** so diffs are reviewable side by side.
5. Reference the key in code via `$t`/`t`. Never inline the literal.
6. When removing a feature, remove its keys from both files together.

## Interpolation and plurals (Vue I18n v11)

- Named interpolation, not string concatenation: `t('dashboard.greeting', { name })` with `"greeting": "Hi, {name}"`. Never build sentences by concatenating translated fragments — word order differs between en and zh-TW.
- Pluralization uses Vue I18n's pipe syntax where needed: `"itemCount": "no items | one item | {count} items"` via `t('...', count)`. Note zh-TW has no plural inflection, so its value can be a single form — but keep the same key shape across locales.
- Avoid embedding markup in messages; if a message needs rich formatting, use the `<i18n-t>` component with slots rather than `v-html`.

## Numbers, currency, and dates — go through the formatter, not raw $t

Locale-sensitive values are formatted with `Intl`, centralized in `composables/useFormat.ts`. Do not hand-format in components.

- Currency varies by market and must respect currency rules: USD/EUR/TWD show 2 decimals; **JPY shows 0 decimals**. Drive this from the market→currency map in `app/constants/markets.ts`, not hardcoded.
- Dates/times: format via `Intl.DateTimeFormat` keyed off the active locale (`en-US` vs `zh-TW`), never a hand-written string template.
- Percentages and large numbers (revenue) use `Intl.NumberFormat` with the active locale for correct grouping separators.

## Language switcher

- Use `useI18n()`'s `locales` + `setLocale(code)` for the switcher, or `useSwitchLocalePath` if you ever need the path form. With `no_prefix`, `setLocale` swaps language in place without navigation.
- The switcher appears in the top bar and on the Login screen (both required by the design). Its option labels come from each locale's own `name` (`English`, `繁體中文`), which read correctly in either language.

## CJK layout discipline

- zh-TW strings are often shorter horizontally but taller; never assume text length. Avoid fixed-width text containers and single-line truncation traps; let containers wrap or ellipsize gracefully.
- Ensure the font stack includes a Traditional Chinese fallback (e.g. `"Noto Sans TC"`) so glyphs don't fall back to a serif system default with mismatched weight.
- Whenever you touch layout, toggle to zh-TW and verify nothing overflows or clips — this is part of "done", not a separate QA pass.

## Review checklist (before considering an i18n-touching task done)

- No literal user-facing strings left in templates or scripts.
- Every new key exists in both `en.json` and `zh-TW.json`, same structure/order.
- Keys follow `module.page.element` / `common.*` / `errors.*` conventions.
- Currency/date/number formatting goes through `useFormat`, JPY has 0 decimals.
- Layout verified in both languages.
