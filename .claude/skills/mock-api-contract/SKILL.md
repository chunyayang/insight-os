---
name: mock-api-contract
description: The API contract for the Insight OS analytics platform — endpoint shapes, response envelope, pagination/filter/error conventions, and TypeScript response types — served by Nuxt Nitro mock routes in server/api/ during Phases 1–2 and designed so the real backend can replace it without any frontend changes. ALWAYS consult this skill whenever you create or edit a mock endpoint, define or change an API response type, write a Vue Query composable that fetches data, add filtering/pagination/sorting/export to a list, or wire the fetch layer. Use it even for a single new endpoint — consistency of the envelope and types across every endpoint is the whole point.
---

# Insight OS — Mock API Contract

The frontend is built against a **mock backend** (Nitro routes under `server/api/`) so Phase 1–2 can proceed without a real server. The contract below is the interface both the mock and the eventual real backend honor. **The interface is the deliverable** — when the real API arrives, only the `$api` `baseURL` and the mock route implementations change; component code, query composables, and types stay identical.

## Non-negotiable principles

1. **Stable interface.** Every endpoint's URL shape, query params, response envelope, and TypeScript type are fixed here. Changing a shape is a contract change that must update the types and every consumer together.
2. **Types are the source of truth.** All response shapes live in `app/types/api.ts`. Mock generators and query composables both import from there — no ad-hoc inline shapes.
3. **Realistic data.** Mocks return believable multi-market e-commerce data (markets: `US`, `JP`, `TW`, `DE`) with a deliberate anomaly in JP this week, so the alert → AI-explanation story is coherent.
4. **Visible latency.** Every mock endpoint delays 200–500ms so loading skeletons actually render and are testable.

## Response envelope

Every successful response uses one consistent envelope. Never return a bare array or bare object.

```ts
// Single resource
interface ApiResponse<T> {
  data: T
  meta?: { requestId: string; generatedAt: string }  // ISO 8601
}

// Paginated list
interface ApiListResponse<T> {
  data: T[]
  pagination: {
    page: number          // 1-based
    pageSize: number
    total: number         // total rows across all pages
    totalPages: number
  }
  meta?: { requestId: string; generatedAt: string }
}

// A feed read newest first, whose head grows while the client pages back
interface ApiCursorResponse<T> {
  data: T[]
  nextCursor: string | null   // opaque; sent back as `cursor`. null: nothing older
  meta?: { requestId: string; generatedAt: string }
}
```

Offset-based pagination causes duplicate entries when new items arrive at the top while users page backward, as shifting indices push items across pages. Using cursor-based pagination solves this by anchoring each cursor to an item's position, which never moves. Customer journeys currently serve as an example of this pattern.

## Error shape

All errors (mock and real) return this shape with a proper HTTP status. In Nitro, throw via `createError` so the status and body are consistent.

```ts
interface ApiError {
  error: {
    code: string        // machine-readable, e.g. 'UNAUTHORIZED', 'VALIDATION_FAILED', 'NOT_FOUND'
    message: string     // human-readable, English; UI maps to i18n by `code`
    details?: unknown    // optional field-level info for validation errors
  }
}
```

- The `$api` plugin's error hooks map any failure into a typed `ApiError`, localized off `error.code` (see i18n `errors.*` keys): a failed query in its surface's inline error state, a failed mutation in a Toast from the cache-level handler in `plugins/vue-query.ts`. Components never parse raw error bodies.
- Include at least one endpoint state that can fail (e.g. a sync job) so the error path is exercised.

## URL & method conventions

Resource-oriented, after Google's API Improvement Proposals: [AIP-121](https://google.aip.dev/121) (resource-oriented design), [AIP-122](https://google.aip.dev/122) (resource names) and [AIP-156](https://google.aip.dev/156) (singletons). Where this section differs, it wins. Every new endpoint follows it, so each page's endpoints can be named before the page is built.

- **A path names a resource: what it is and who owns it.** It never names the page or tab that shows the resource, or the component that fetches it. The Security tab reads `/api/org/sso` and `/api/me/sessions`; the Appearance tab reads nothing, since theme and language live in cookies. Which queries the layout prefetches is a client rule (`stack-conventions` → *State management*), not a URL one.
- **Every resource is a collection or a singleton.**
  - **Collection:** a plural noun in kebab-case, such as `/api/customers` or `/api/org/api-keys`. `GET` lists it and `POST` creates in it. Each item sits at `/:id`, with `GET`, `PATCH` and `DELETE`.
  - **Singleton:** one per parent, a singular noun, such as `/api/org/settings`. It takes `GET`, and `PATCH` when it's writable. It is never created or deleted. A read-only view computed from the data is also a singleton, such as `/api/dashboard/summary` or `/api/analytics/revenue`.
  - **A child sits under its parent's item**, as in `/api/customers/:id/journeys`. A fixed word never sits where a parent's `:id` goes: `/api/campaigns/abtests` would collide with `/api/campaigns/:id`.
- **The owner decides the prefix.**
  - **The organization's business data sits at the top level:** customers, campaigns, analytics, data sources. The token scopes every request to the signed-in organization, so no path names one.
  - **The account itself sits under two aliases the server resolves from the token.** `/api/org/…` is the organization: its configuration, members, keys and billing. `/api/me/…` is the signed-in user: their preferences, sessions and notifications. `me` is always the caller, so no path reaches another user's records.
- **A setting is a field, not a path.** `/api/org/settings` and `/api/me/settings` are one record each. A new organization setting is a field on the first, and a new preference is a field on the second. Something gets its own path only when it's a collection, like sessions, or needs a permission of its own, like SSO.
- **Methods:** `GET` reads, `POST` creates, `PATCH` updates part of a resource, `DELETE` removes it. Reads never mutate. An action that is none of these, such as retrying a sync job or verifying a 2FA code, is a `POST` to a verb under the resource: `POST /api/sync-jobs/:id/retry`. AIP-136 writes that as a `:retry` suffix instead, but a colon doesn't work in Nitro's file-based route names on every OS.
- Endpoints, built and planned:
  - `GET /api/dashboard/summary?market=All&locale=zh-TW` → today's KPIs + AI daily summary + anomaly alerts. With a single `market`, the revenue KPI declares that market's `functionalCurrency`, and its delta and sparkline are computed in it; at `All` they stay in USD and `functionalCurrency` is `null`
  - `GET /api/anomalies/:id?locale=zh-TW` → one `AnomalyAlert`, for a chat opened from *Ask AI why →*
  - `GET /api/analytics/revenue?range=30d&markets=US,JP` → revenue series by market
  - `GET /api/analytics/funnel?market=JP&range=7d`
  - `GET /api/analytics/retention?range=90d`
  - `GET /api/customers?page=1&pageSize=20&segment=vip&market=JP&q=...`
  - `GET /api/customers/:id`
  - `GET /api/customers/:id/journeys?pageSize=5`, then `&cursor=<nextCursor>` → the Journey tab's timeline, a page of journeys
  - `GET /api/customers/:id/ai-summary?locale=zh-TW` → the Journey tab's AI health summary
  - `GET /api/campaigns`
  - `GET /api/ab-tests` → the A/B Test tab. A test is a site experiment, such as checkout button copy or a page layout, and belongs to no campaign, so it is a collection of its own rather than a child of `/api/campaigns/:id`.
  - `GET /api/data-sources`, each source carrying its health and last sync time
  - `GET /api/sync-jobs?latest=true` → the Sync Status tab: each source's most recent run, one row per source, as an `ApiListResponse` the tab shows without paging. Without `latest` the collection holds every run; nothing reads that yet. `POST /api/sync-jobs/:id/retry`
  - `POST /api/ai/chat` → AI Assistant analysis response. An action, not a resource: the server keeps no conversation (`stack-conventions` → *State management*).
  - Organization (`/api/org`):
    - `GET` / `PATCH /api/org/settings` → organization policy (`OrgSettings`); `PATCH` is Admin only
    - `GET /api/org/members`, `GET /api/org/activity` → Team's members and audit log
    - Admin only: `GET` / `POST /api/org/api-keys`, `DELETE /api/org/api-keys/:id`; `GET /api/org/subscription`, `GET /api/org/usage`, `GET /api/org/invoices` (+ `/:id`); `GET` / `PATCH /api/org/sso`
  - Signed-in user (`/api/me`):
    - `GET` / `PATCH /api/me/settings` → the user's own preferences (`UserSettings`); any role
    - `GET /api/me/sessions`, `DELETE /api/me/sessions/:id`
    - `GET /api/me/notifications`
    - 2FA is still to be designed with Security: turning it on is a verification flow, not a plain field update.

## Query parameter conventions (identical across all list endpoints)

- Pagination: `page` (1-based), `pageSize`; or, on a feed paged by cursor (see *Response envelope*), `cursor` and `pageSize`, with no `cursor` on the first page.
- Sorting: `sort=<field>&order=asc|desc`.
- Global search: `q`.
- Filters: explicit named params (`market`, `segment`, `status`, `channel`).
- Ranges: `range` accepts tokens `7d | 30d | 90d | mtd | ytd` **or** explicit `from` / `to` ISO dates. A given request uses tokens or explicit dates, not both.
- Multi-value: comma-separated (`markets=US,JP,TW`). These map directly onto the page's URL-backed filters (see `stack-conventions` → *State management*), so query composables can pass filter refs straight through.
- Locale: `locale=en|zh-TW` on requests for AI text, and on no other request (see *AI text and locale* below).
- Display currency: **no query param.** Monetary endpoints return every currency at once as a `Money` map (see *Currency & money conversion* below); the display toggle is a client-side key switch, so no per-currency request is made. Which currency the client then *shows* is a display decision, not a contract one — `/product-spec` → `currency-model.md`.

## Core domain types (define in app/types/api.ts)

Keep these authoritative; mocks and components import them.

```ts
type MarketCode = 'US' | 'JP' | 'TW' | 'DE'
type CurrencyCode = 'USD' | 'JPY' | 'TWD' | 'EUR'
type Role = 'admin' | 'analyst' | 'viewer'
type LocaleCode = 'en' | 'zh-TW'   // the i18n locale codes; sent with every request for AI text

// A cached AI summary: one analysis, presented in the requested locale (see *AI text and locale*)
interface AiSummary { text: string; generatedAt: string }  // generatedAt: when the analysis ran, same in every locale

// Same amount, independently aggregated in ALL supported currencies using
// historical daily official rates (see conversion rules below). Each key is a
// standalone correct total — they are NOT related by a constant, so the client
// must never derive one currency from another. The client only picks a key to display.
type Money = Record<CurrencyCode, number>

interface FxProvenance {            // audit metadata — NOT a reconstructable multiplier
  method: 'historical-daily-official'  // each day converted at that day's official rate, then summed
  source: string                   // rate provider / source of record (e.g. 'ECB', 'internal-fx-eod')
  rangeFrom: string                // ISO date — first day covered by the conversion
  rangeTo: string                  // ISO date — last day covered
}

interface KpiMetric {
  key: 'revenue' | 'orders' | 'conversionRate' | 'activeUsers'
  value: number | Money            // Money for monetary metrics (revenue); plain number otherwise
  functionalCurrency: CurrencyCode | null  // the scoped market's, on a monetary metric; null at `All` and on counts and rates
  deltaPct: number                 // vs. comparison period; negative = down
  sparkline: number[]              // shape only; one market's monetary sparkline is in its functional currency
}

interface AnomalyAlert {
  id: string                       // opaque and stable across requests, so a link can name it (`?anomaly=<id>`)
  severity: 'info' | 'warning' | 'critical'
  market: MarketCode
  metricKey: KpiMetric['key']
  message: string                  // in the request's `locale` (see *AI text and locale*)
  detectedAt: string               // ISO 8601
}

interface DashboardSummary {
  date: string                     // ISO date
  kpis: KpiMetric[]                // monetary KPIs carry Money (all 4 currencies)
  alerts: AnomalyAlert[]
  aiSummary: AiSummary             // in the request's `locale`
  fx: FxProvenance                 // how the Money totals in this payload were derived (audit)
}

interface TimeSeriesPoint { t: string; value: number }        // t = ISO date; non-monetary series
interface MarketSeries { market: MarketCode; points: TimeSeriesPoint[] }  // e.g. conversion, traffic

// Monetary series carry Money per point: each day already converted at that day's
// official rate, so summing points reproduces the historically-accurate total.
interface MoneyPoint { t: string; value: Money }              // t = ISO date
interface RevenueMarketSeries {
  market: MarketCode
  functionalCurrency: CurrencyCode // declared, never derived from `market`
  points: MoneyPoint[]
}

interface RevenueResponse {
  fx: FxProvenance                 // audit metadata for the day-by-day conversion (not a rate table)
  series: RevenueMarketSeries[]    // each point carries all 4 currencies, converted at that day's rate
  totalsByMarket: { market: MarketCode; total: Money }[]  // sum of daily-converted amounts per currency
}
```

- Monetary values are returned as a **`Money` map carrying all four currencies at once** (`{ USD, JPY, TWD, EUR }`), each computed **server-side using historical daily official rates** — every day is converted at that day's rate and then summed. A currency total is therefore the sum of daily-converted amounts, **never** the functional-currency total times a single rate. Each currency in the map is an independent, historically-accurate figure: the client must never derive one from another, and never converts. The client reads the key it needs (`/product-spec` → `currency-model.md` decides which) and only **formats** (decimals, grouping) via `useFormat`. Because official daily rates are frozen, the same range reproduces the same figure on every query (audit-stable). Remember **JPY and TWD display with 0 decimals** (TWD still carries sub-units in the payload).
- Timestamps are always **ISO 8601 strings**, never epoch ints or pre-formatted display strings — display formatting is a frontend/i18n concern. They are UTC (`Z`), except a customer's journey event, which carries the customer's own offset (see *Customer journeys* below).

## Currency & money conversion (server-side, historical daily rates)

Cross-currency conversion is an **API-layer responsibility** and, for financial integrity and auditability, follows a rule that cannot be violated: **each day's transactions are converted at that day's official exchange rate, then summed.** Period-end / single-rate conversion (functional-currency total × one rate) is **not permitted** for business figures. This can only be done in the API layer, against the database, day by day.

- Every monetary figure is aggregated **per currency, per day** on the server (day amount × that day's official rate), then summed over the requested range. The result is emitted as a **`Money` map** (`{ USD, JPY, TWD, EUR }`) where each key is an independent, historically-accurate total.
- Because the four currencies are aggregated independently, **none is derivable from another** — there is no shared "snapshot" rate. The response carries **`FxProvenance`** (method, source, covered range) for audit; it is deliberately not a rate table the client could multiply by.
- The display-currency toggle is **client-side only**: it selects which already-computed `Money` key to render (e.g. `total.EUR` vs `total.USD`) instantly, with **no new network request**. The active currency is view state on the page's selector, URL-backed as `?currency=` and never sent to the API (`stack-conventions` → *State management*); it defaults to the organization's presentation currency. Reading that default is not cloning — org settings stay server data and are never mirrored into Pinia.
- **The contract obligation:** every monetary resource declares a **`functionalCurrency: CurrencyCode`** — the currency the operation behind that record runs on — so the client can render the operating figure with no selector and no extra request. It is a **declared field, not a function of the record's market**: a record spanning every market carries whatever currency it declares, and a campaign's follows its ad account rather than its target market. The client must never map market → currency itself. One `Money` map serves the Analytics-normalized view, functional-currency views and dual-currency cells alike. **Which of those a given surface renders is decided in `/product-spec` → `currency-model.md`, not here.**
- The frontend performs **display formatting only** (grouping, decimals, symbol) via `useFormat`. It never performs conversion. **JPY and TWD render with 0 decimals** — display only; TWD keeps its sub-units in the payload, since whole-dollar NT$ is a quoting convention rather than a missing minor unit.
- **Range vs. currency are different kinds of change.** `range`/`from`/`to` are **data-scope** params: changing them alters which days are aggregated (and which daily rates apply), so the server must **re-query and re-aggregate** — it flows through the query key and triggers a refetch (with a loading skeleton). The currency toggle is a pure display projection over already-fetched data — no refetch. Keeping the frequent currency flip instant is precisely why all currencies are returned up front.
- There is **no `currency` query param** — monetary endpoints always return the full `Money` map. Non-monetary series (orders, conversion rate, users) are currency-independent and returned as plain numbers.
- Mock note: seed a per-day official-rate table in `server/utils/mock/` and convert day-by-day so totals are reproducible; echo realistic `FxProvenance`. Per-day rates themselves, if ever needed, belong in a dedicated audit/export endpoint, not the display payload.
- Trade-off (documented): the multi-currency `Money` map bakes the four-currency assumption into every monetary type. If the supported currency set grows large, or an un-paginated per-transaction monetary export is added, revisit and switch those endpoints to a single-requested-currency payload — still converted day-by-day historically; only the delivery shape changes. The trigger and the client-side upgrade path are settled in `/product-spec` → `currency-model.md` (§6).

## Customer journeys (GET /api/customers/:id/journeys)

The Journey tab's timeline — types, paging, grouping and event rules: **read [`references/customer-journeys.md`](references/customer-journeys.md) before touching this endpoint or the Journey tab.**

## AI text and locale

AI text arrives in the interface language (`/product-spec` → `spec.md` §2, *Internationalization*).

- **Every request for AI text carries `locale`** (`LocaleCode`): a query param on a `GET`, a body field on `POST /api/ai/chat`. No other request does. An unknown locale is `400 VALIDATION_FAILED`.
- **The query key for AI text includes the locale,** read from `useI18n().locale`, so a language switch refetches it, and switching back is a cache hit.
- **An anomaly alert's `message` is in the request's locale too,** written as translations of each other with the same figures. It arrives with the Dashboard summary's request, or on `GET /api/anomalies/:id?locale=`.
- **A cached summary is one analysis, presented per locale.** The Dashboard's `aiSummary` and a customer's `ai-summary` must say the same thing in every language, never a separate generation per language. `generatedAt` is when the analysis ran, so it is the same in each locale. The mock returns canned text in both locales, with the two versions written as translations of each other.

## AI Assistant endpoint (POST /api/ai/chat)

The hero flow — request/response types, links, history and the canned example: **read [`references/ai-chat.md`](references/ai-chat.md) before touching this endpoint or the AI page.**

## How the frontend consumes this (alignment with stack-conventions)

- Only Vue Query composables in `composables/queries/` call `$api`; components consume query results. Query keys come from per-domain key factories.
- Filter values — the page's URL params, resolved through the route→filters registry (`stack-conventions` → *State management*) — flow into query params using the conventions above; changing a filter refetches.
- Export CSV is a frontend transform over already-fetched list data (or a dedicated `?format=csv` variant if a list is large) — and is permission-gated (`can('export:csv')`).

## Mock implementation notes

- Put deterministic-ish generators in `server/utils/mock/` seeded so data is stable within a session but varied across markets; bake in the JP weekly anomaly explicitly.
- The Dashboard's story holds on any date: `TODAY_VS_YESTERDAY` in `server/utils/mock/markets.ts` sets each market's day-over-day movement, which gives the KPI cards revenue, orders and active users up and conversion down. Alerts and the AI summary compute any figure they quote from the same data rather than hardcoding it.
- Respect all query params in the mock (pagination, sort, filters) so the UI's controls are genuinely exercised, not decorative.
- Add the 200–500ms delay in a shared helper so it's consistent and easy to remove for tests.
- Keep one endpoint capable of returning an `ApiError` (e.g. a failed sync row / retry) to exercise the error + i18n path end to end, inline and in a Toast.

## Checklist before an API-touching task is done

- New/changed endpoint uses the standard envelope (`ApiResponse` / `ApiListResponse` / `ApiCursorResponse`) and error shape.
- Types added/updated in `app/types/api.ts`; mock and consumers import them (no inline shapes).
- List endpoints honor page/pageSize/sort/order/q/filter/range params.
- An endpoint returning AI text takes `locale`, includes it in its query key, and has canned text in both locales.
- Timestamps ISO 8601. Monetary values are a **`Money` map (all 4 currencies), each aggregated server-side with historical daily official rates** (day-converted then summed — never functional-currency total × one rate); the client picks the display key, only formats (JPY 0-decimal downstream), and never converts. Responses carry `FxProvenance` for audit.
- Fetching goes through a query composable, not `$api`-in-component.
