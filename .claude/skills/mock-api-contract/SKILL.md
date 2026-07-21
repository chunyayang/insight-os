---
name: mock-api-contract
description: The API contract for the Insight OS analytics platform — endpoint shapes, response envelope, pagination/filter/error conventions, and TypeScript response types — served by Nuxt Nitro mock routes in server/api/ during Phases 1–2 and designed so the real backend can replace it without any frontend changes. ALWAYS consult this skill whenever you create or edit a mock endpoint, define or change an API response type, write a Vue Query composable that fetches data, add filtering/pagination/sorting/export to a list, or wire the Axios layer. Use it even for a single new endpoint — consistency of the envelope and types across every endpoint is the whole point.
---

# Insight OS — Mock API Contract

The frontend is built against a **mock backend** (Nitro routes under `server/api/`) so Phase 1–2 can proceed without a real server. The contract below is the interface both the mock and the eventual real backend honor. **The interface is the deliverable** — when the real API arrives, only the Axios `baseURL` and the mock route implementations change; component code, query composables, and types stay identical.

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
```

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

- The Axios response interceptor maps any non-2xx into a typed `ApiError` and surfaces a localized Toast keyed off `error.code` (see i18n `errors.*` keys). Components never parse raw error bodies.
- Include at least one endpoint state that can fail (e.g. a sync job) so the error path is exercised.

## URL & method conventions

- Base path `/api`. RESTful nouns, plural, kebab where multi-word.
- `GET` for reads, `POST` create, `PATCH` partial update, `DELETE` remove. Reads never mutate.
- Resource examples (align endpoints to the sidebar IA):
  - `GET /api/dashboard/summary` → today's KPIs + AI daily summary + anomaly alerts
  - `GET /api/analytics/revenue?range=30d&markets=US,JP` → revenue series by market
  - `GET /api/analytics/funnel?market=JP&range=7d`
  - `GET /api/analytics/retention?range=90d`
  - `GET /api/customers?page=1&pageSize=20&segment=vip&market=JP&q=...`
  - `GET /api/customers/:id`
  - `GET /api/campaigns` , `GET /api/campaigns/abtests`
  - `GET /api/data-sources` , `GET /api/data-sources/sync-status`
  - `GET /api/team/members` , `GET /api/team/activity`
  - `POST /api/ai/chat` → AI Assistant analysis response
  - `GET /api/notifications`

## Query parameter conventions (identical across all list endpoints)

- Pagination: `page` (1-based), `pageSize`.
- Sorting: `sort=<field>&order=asc|desc`.
- Global search: `q`.
- Filters: explicit named params (`market`, `segment`, `status`, `channel`).
- Ranges: `range` accepts tokens `7d | 30d | 90d | mtd | ytd` **or** explicit `from` / `to` ISO dates. A given request uses tokens or explicit dates, not both.
- Multi-value: comma-separated (`markets=US,JP,TW`). These map directly onto the global filters held in Pinia, so query composables can pass filter refs straight through.
- Display currency: **no query param.** Monetary endpoints return every currency at once as a `Money` map (see *Currency & money conversion* below); the display toggle is a client-side key switch, so no per-currency request is made. The client's default display currency is `USD`.

## Core domain types (define in app/types/api.ts)

Keep these authoritative; mocks and components import them.

```ts
type MarketCode = 'US' | 'JP' | 'TW' | 'DE'
type CurrencyCode = 'USD' | 'JPY' | 'TWD' | 'EUR'
type Role = 'admin' | 'analyst' | 'viewer'

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
  deltaPct: number                 // vs. comparison period; negative = down
  sparkline: number[]              // mini-chart shape only (scale-invariant → currency-independent)
}

interface AnomalyAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  market: MarketCode
  metricKey: KpiMetric['key']
  message: string                  // English; UI may localize by code if provided
  detectedAt: string               // ISO 8601
}

interface DashboardSummary {
  date: string                     // ISO date
  kpis: KpiMetric[]                // monetary KPIs carry Money (all 4 currencies)
  alerts: AnomalyAlert[]
  aiSummary: { text: string; generatedAt: string }
  fx: FxProvenance                 // how the Money totals in this payload were derived (audit)
}

interface TimeSeriesPoint { t: string; value: number }        // t = ISO date; non-monetary series
interface MarketSeries { market: MarketCode; points: TimeSeriesPoint[] }  // e.g. conversion, traffic

// Monetary series carry Money per point: each day already converted at that day's
// official rate, so summing points reproduces the historically-accurate total.
interface MoneyPoint { t: string; value: Money }              // t = ISO date
interface RevenueMarketSeries { market: MarketCode; points: MoneyPoint[] }

interface RevenueResponse {
  fx: FxProvenance                 // audit metadata for the day-by-day conversion (not a rate table)
  series: RevenueMarketSeries[]    // each point carries all 4 currencies, converted at that day's rate
  totalsByMarket: { market: MarketCode; total: Money }[]  // sum of daily-converted amounts per currency
}
```

- Monetary values are returned as a **`Money` map carrying all four currencies at once** (`{ USD, JPY, TWD, EUR }`), each computed **server-side using historical daily official rates** — every day is converted at that day's rate and then summed. A currency total is therefore the sum of daily-converted amounts, **never** the native total times a single rate. Each currency in the map is an independent, historically-accurate figure: the client must never derive one from another, and never converts. The client reads the key for the active display currency (default `USD`) and only **formats** (decimals, grouping) via `useFormat`. Because official daily rates are frozen, the same range reproduces the same figure on every query (audit-stable). Remember **JPY has 0 decimals**.
- Timestamps are always **ISO 8601 strings**, never epoch ints or pre-formatted display strings — display formatting is a frontend/i18n concern.

## Currency & money conversion (server-side, historical daily rates)

Cross-currency conversion is an **API-layer responsibility** and, for financial integrity and auditability, follows a rule that cannot be violated: **each day's transactions are converted at that day's official exchange rate, then summed.** Period-end / single-rate conversion (native total × one rate) is **not permitted** for business figures. This can only be done in the API layer, against the database, day by day.

- Every monetary figure is aggregated **per currency, per day** on the server (day amount × that day's official rate), then summed over the requested range. The result is emitted as a **`Money` map** (`{ USD, JPY, TWD, EUR }`) where each key is an independent, historically-accurate total.
- Because the four currencies are aggregated independently, **none is derivable from another** — there is no shared "snapshot" rate. The response carries **`FxProvenance`** (method, source, covered range) for audit; it is deliberately not a rate table the client could multiply by.
- The display-currency toggle is **client-side only**: it selects which already-computed `Money` key to render (e.g. `total.EUR` vs `total.USD`) instantly, with **no new network request**. The active currency is UI state in Pinia, **scoped to Analytics** (default `USD`).
- **Display scope — native currency off Analytics.** The currency selector exists only on Analytics (cross-market normalization). Elsewhere (Customers, Campaigns, Dashboard KPI cards, etc.) each monetary record is displayed in its **native currency** — the client reads that record's native-currency key from the `Money` map. Every monetary resource therefore declares a **`nativeCurrency: CurrencyCode`** so the frontend knows which key to show without any selector. For records whose market is **`All`**, `nativeCurrency` is **`USD`** (international/base currency). The same `Money` map thus serves both the Analytics-normalized view and native views with no extra request.
- The frontend performs **display formatting only** (grouping, decimals, symbol) via `useFormat`. It never performs conversion. **JPY renders with 0 decimals.**
- **Range vs. currency are different kinds of change.** `range`/`from`/`to` are **data-scope** params: changing them alters which days are aggregated (and which daily rates apply), so the server must **re-query and re-aggregate** — it flows through the query key and triggers a refetch (with a loading skeleton). The currency toggle is a pure display projection over already-fetched data — no refetch. Keeping the frequent currency flip instant is precisely why all currencies are returned up front.
- There is **no `currency` query param** — monetary endpoints always return the full `Money` map. Non-monetary series (orders, conversion rate, users) are currency-independent and returned as plain numbers.
- Mock note: seed a per-day official-rate table in `server/utils/mock/` and convert day-by-day so totals are reproducible; echo realistic `FxProvenance`. Per-day rates themselves, if ever needed, belong in a dedicated audit/export endpoint, not the display payload.
- Trade-off (documented): the multi-currency `Money` map bakes the four-currency assumption into every monetary type. If the supported currency set grows large, or an un-paginated per-transaction monetary export is added, revisit and switch those endpoints to a single-requested-currency payload (Option A) — still converted day-by-day historically; only the delivery shape changes.

## AI Assistant endpoint (POST /api/ai/chat)

The hero flow. Request/response are structured so the UI can render narrative + chart + ranked causes without parsing prose.

```ts
interface AiChatRequest {
  message: string
  context?: { market?: MarketCode; range?: string }
  history?: { role: 'user' | 'assistant'; content: string }[]
}

interface AiCause { rank: number; title: string; explanation: string; confidence: number } // 0..1

interface AiChatResponse {
  narrative: string
  chart?: {
    type: 'line' | 'bar' | 'funnel'
    series: MarketSeries[]
    annotations?: { t: string; label: string }[]   // e.g. mark the drop
  }
  causes: AiCause[]
  followUps: string[]                                // suggested question chips
}
```

- The canned example: asking why JP conversion dropped this week returns a narrative, a JP conversion line chart with a drop annotation, 3 ranked causes, and follow-up chips — matching the design's worked example.

## How the frontend consumes this (alignment with stack-conventions)

- Only Vue Query composables in `composables/queries/` call the Axios instance; components consume query results. Query keys come from per-domain key factories.
- Filter refs from Pinia flow into query params using the conventions above; changing a filter refetches.
- Export CSV is a frontend transform over already-fetched list data (or a dedicated `?format=csv` variant if a list is large) — and is permission-gated (`can('export:csv')`).

## Mock implementation notes

- Put deterministic-ish generators in `server/utils/mock/` seeded so data is stable within a session but varied across markets; bake in the JP weekly anomaly explicitly.
- Respect all query params in the mock (pagination, sort, filters) so the UI's controls are genuinely exercised, not decorative.
- Add the 200–500ms delay in a shared helper so it's consistent and easy to remove for tests.
- Keep one endpoint capable of returning an `ApiError` (e.g. a failed sync row / retry) to exercise the error + Toast + i18n path end to end.

## Checklist before an API-touching task is done

- New/changed endpoint uses the standard envelope (`ApiResponse` / `ApiListResponse`) and error shape.
- Types added/updated in `app/types/api.ts`; mock and consumers import them (no inline shapes).
- List endpoints honor page/pageSize/sort/order/q/filter/range params.
- Timestamps ISO 8601. Monetary values are a **`Money` map (all 4 currencies), each aggregated server-side with historical daily official rates** (day-converted then summed — never native total × one rate); the client picks the display key, only formats (JPY 0-decimal downstream), and never converts. Responses carry `FxProvenance` for audit.
- Fetching goes through a query composable, not Axios-in-component.
