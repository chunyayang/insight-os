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

- The `$api` plugin's error hooks map any failure into a typed `ApiError`, and the cache-level handler in `plugins/vue-query.ts` surfaces a localized Toast keyed off `error.code` (see i18n `errors.*` keys). Components never parse raw error bodies.
- Include at least one endpoint state that can fail (e.g. a sync job) so the error path is exercised.

## URL & method conventions

- Base path `/api`. RESTful nouns, plural, kebab where multi-word.
- `GET` for reads, `POST` create, `PATCH` partial update, `DELETE` remove. Reads never mutate.
- Resource examples (align endpoints to the sidebar IA):
  - `GET /api/dashboard/summary?market=All&locale=zh-TW` → today's KPIs + AI daily summary + anomaly alerts
  - `GET /api/anomalies/:id` → one `AnomalyAlert`, for a chat opened from *Ask AI why →*
  - `GET /api/analytics/revenue?range=30d&markets=US,JP` → revenue series by market
  - `GET /api/analytics/funnel?market=JP&range=7d`
  - `GET /api/analytics/retention?range=90d`
  - `GET /api/customers?page=1&pageSize=20&segment=vip&market=JP&q=...`
  - `GET /api/customers/:id`
  - `GET /api/customers/:id/journeys?pageSize=5`, then `&cursor=<nextCursor>` → the Journey tab's timeline, a page of journeys
  - `GET /api/customers/:id/ai-summary?locale=zh-TW` → the Journey tab's AI health summary
  - `GET /api/campaigns` , `GET /api/campaigns/abtests`
  - `GET /api/data-sources` , `GET /api/data-sources/sync-status`
  - `GET /api/team/members` , `GET /api/team/activity`
  - `POST /api/ai/chat` → AI Assistant analysis response
  - `GET /api/notifications`

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
  deltaPct: number                 // vs. comparison period; negative = down
  sparkline: number[]              // mini-chart shape only (scale-invariant → currency-independent)
}

interface AnomalyAlert {
  id: string                       // opaque and stable across requests, so a link can name it (`?anomaly=<id>`)
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
  aiSummary: AiSummary             // in the request's `locale`
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

The Journey tab's timeline (`/product-spec` → `spec.md` §4.5): one customer's events across channels, grouped into journeys that each end at a purchase.

```ts
type JourneyEventType = 'ad_click' | 'session' | 'livestream_view' | 'add_to_cart' | 'checkout_abandoned'
  | 'coupon_rejected' | 'coupon_redeemed' | 'checkout_completed' | 'subscription_renewed' | 'email_open' | 'review'
type JourneyChannel = 'ads' | 'web' | 'app' | 'livestream' | 'email' | 'system'  // system: no channel, e.g. a renewal

interface JourneyEvent {
  id: string
  type: JourneyEventType                             // a code; the label is the client's i18n
  channel: JourneyChannel                            // a code; picks the icon
  occurredAt: string                                 // the customer's local time with their offset: '2026-06-24T19:42:00+09:00'
  timeZone: string                                   // the IANA zone of that offset: 'Asia/Tokyo'
  pageViews?: number                                 // `session` only: its page views, folded into one line
  checkoutStep?: 'information' | 'shipping' | 'payment'  // `checkout_abandoned` only: the last step reached
  rejectionCode?: 'minimum_spend_not_met' | 'expired' | 'usage_limit_reached' | 'market_not_eligible'  // `coupon_rejected` only
  orderIds?: string[]                                // `checkout_completed` only: the orders it created
}

interface OrderSummary {                             // what a list shows of an order, not the full order
  id: string
  orderNumber: string                                // unique across shops: the label
  total: Money
  functionalCurrency: CurrencyCode
}

interface CustomerJourney {
  id: string
  orders: OrderSummary[]                             // the purchase that closed it, one or more orders; empty: no purchase yet
  total: Money | null                                // the orders' sum, from the server; null when `orders` is empty
  functionalCurrency: CurrencyCode | null            // shared by every order; null when they differ
  events: JourneyEvent[]                             // oldest first; never empty
}
// GET /api/customers/:id/journeys → ApiCursorResponse<CustomerJourney>
```

- **The server draws the journeys; the client never regroups or re-sorts.** Grouping depends on the whole event stream, which the client never holds. Journeys come newest first. The unfinished journey (`orders` empty) is the first item of the first page when there is one, and appears nowhere else.
- **Paged by cursor, counted in journeys.** `pageSize` counts journeys, not events. *Show older journeys* sends the last page's `nextCursor` as `cursor`, and shows while it isn't `null`: one infinite query, keyed by customer, with no other params. The cursor encodes the last journey's place in the order, not its id: the time of its first order, with the journey id to break ties. The server pages from that place without looking the journey up, so the next page still resolves if that journey has since changed. A closed journey's place never moves, even when a later checkout joins its purchase, so a purchase or a new journey at the head neither repeats nor skips one.
- **Events are the customer's actions** (`/product-spec` → `spec.md` §4.5). Order statuses such as shipped or delivered describe the goods, so they are never events.
- **An action on a purchase's orders stays in its journey.** Picking up an order or reviewing it is the tail of that shopping decision, so the server places it in the purchase's journey, after `checkout_completed`, however much later it happens. Any other action after a purchase, such as an `email_open`, belongs to the next journey. A closed journey can gain such an event at any time, and its place in the paging order doesn't move; the client shows it on its next refetch.
- **Every recognised event appears; an unrecognised one is dropped.** The client renders an event only when its `type` and `channel` are codes it knows, and filters out the rest, never showing a generic row: a row that can't say what happened is clutter, and it would display whatever its source sent. So a new type appears once it joins `JourneyEventType` and its label, never before. A journey left with no events is not shown; only the unfinished one can be, since a closed journey keeps its `checkout_completed`.
- **A session folds into one event.** Its page views become one `session` event with `pageViews`; the server does the folding.
- **Event times are the customer's local time** (`/product-spec` → `timezone-utc-buckets-for-mvp.md` §3). `occurredAt` carries the customer's offset and `timeZone` names its zone. Both are always present: where a source records no zone, such as an ad click or a proxied email open, the server takes it from the customer's nearest session event. The client formats `occurredAt` in `timeZone`, never in the browser's zone, so the server render and the client render agree. With its offset, `occurredAt` is still an exact instant.
- **Events record facts, never inferences.** `checkoutStep` and `rejectionCode` are what the checkout and the coupon engine logged: *Checkout abandoned · at shipping*, *Coupon rejected · below minimum spend*. Why the customer left is a reading of the whole timeline, often with more than one cause, so it is the AI summary's to say, never a field on an event.
- **A purchase is one shopping decision, which may be several orders** (`/product-spec` → `spec.md` §4.5). One checkout can create several, split by shop, shipping method or subscription items: one `checkout_completed` event names them all in `orderIds`. Several checkouts can be one decision, such as a supplementary order placed shortly after: the server joins the checkouts completed within its window (such as 30 minutes) into one purchase. Either way, the purchase closes one journey, and `orders` lists every order in it. Until the window passes, a closed journey can still gain an order; the client shows it on its next refetch.
- **A subscription renewal is not a purchase.** It is charged on a schedule, not by a decision, so `subscription_renewed` is an event like a review: it never closes a journey, and its order is in no journey's `orders` or `total`.
- **The journey's `total` is the server's sum of its orders,** never the client's. It renders by the dual-currency rule with the journey's `functionalCurrency`, or in the presentation currency alone when that is `null`: orders in different functional currencies make an aggregate, which has none (`/product-spec` → `currency-model.md` §3). Each `OrderSummary` is money on a record, with its own `functionalCurrency`.
- **The AI health summary above the timeline is a separate endpoint,** `GET /api/customers/:id/ai-summary?locale=` → `ApiResponse<AiSummary>`. A language switch refetches the summary only, and paging journeys never refetches the summary.

## AI text and locale

AI text arrives in the interface language (`/product-spec` → `spec.md` §2, *Internationalization*).

- **Every request for AI text carries `locale`** (`LocaleCode`): a query param on a `GET`, a body field on `POST /api/ai/chat`. No other request does. An unknown locale is `400 VALIDATION_FAILED`.
- **The query key for AI text includes the locale,** read from `useI18n().locale`, so a language switch refetches it, and switching back is a cache hit.
- **A cached summary is one analysis, presented per locale.** The Dashboard's `aiSummary` and a customer's `ai-summary` must say the same thing in every language, never a separate generation per language. `generatedAt` is when the analysis ran, so it is the same in each locale. The mock returns canned text in both locales, with the two versions written as translations of each other.
- **Not yet in the code:** `GET /api/dashboard/summary` ignores `locale`, and `buildAiSummary` (`server/utils/mock/alerts.ts`) writes English only, so `dashboardKeys.summary` has no locale yet.

## AI Assistant endpoint (POST /api/ai/chat)

The hero flow. Request/response are structured so the UI can render narrative + chart + ranked causes without parsing prose.

```ts
interface AiChatRequest {
  message: string
  context?: { anomalyId?: string }                   // set when the chat started from an anomaly
  locale: LocaleCode                                 // the answer's language
  history?: { role: 'user' | 'assistant'; content: string }[]  // the conversation so far, held by the client
}

// Where a link goes — never a URL. Plain strings: model output, checked by the client at runtime.
interface AiLinkTarget {
  route: string                                      // registry route pattern, e.g. '/analytics/funnel'
  params?: Record<string, string>                    // target page's URL params, e.g. { market: 'JP', range: '7d' }
}

interface AiCause {
  rank: number; title: string; explanation: string
  confidence: number                                 // 0..1
  links?: AiLinkTarget[]                             // where this cause's evidence is
}

interface AiChatResponse {
  narrative: string
  chart?: {
    type: 'line' | 'bar' | 'funnel'
    series: MarketSeries[]
    annotations?: { t: string; label: string }[]   // e.g. mark the drop
  }
  causes: AiCause[]
  followUps: string[]                                // suggested question chips
  links?: AiLinkTarget[]                             // for the answer as a whole
}
```

- **No market or range in the request.** The AI page has no control for either (`/product-spec` → `spec.md` §4.4), so the client has none to send. A chat opened from *Ask AI why →* sends `context.anomalyId` on every turn, and the server reads market, metric and window from that record; a free-typed question is read for its own market, or answered across markets with the narrative saying so. An unknown `anomalyId` is `404 NOT_FOUND`, here and on `GET /api/anomalies/:id`.
- **The endpoint keeps no conversation, and there is no conversation id.** The client holds one conversation for the session and sends it as `history` on every turn (`stack-conventions` → *State management*). Saved conversations are not in the MVP. They would replace `history` with a conversation id, which is a contract change.
- **The answer is in `locale`.** Earlier turns in `history` keep the language they were written in: after a language switch, only the next answer follows the new locale. Chat answers are not cached, since each is written for the one person who asked.
- **Links name a target, never a URL.** The server emits only routes it knows, but the client never relies on that: it builds every link through the route→filters registry, which drops an unknown route, a param the target doesn't accept, or an invalid value, and skips a route the role can't open (`stack-conventions` → *State management*). There is no `href` or `label` field — the label is the client's i18n, chosen by target route (*Open in Analytics →*).
- The canned example: asking why JP conversion dropped this week (`context.anomalyId: 'anom_cl290f8aj0001'`) returns a narrative, a JP conversion line chart with a drop annotation, 3 ranked causes — the first linking to `{ route: '/analytics/funnel', params: { market: 'JP', range: '7d' } }` — and follow-up chips, matching the design's worked example. Its text is canned in both locales.

## How the frontend consumes this (alignment with stack-conventions)

- Only Vue Query composables in `composables/queries/` call `$api`; components consume query results. Query keys come from per-domain key factories.
- Filter values — the page's URL params, resolved through the route→filters registry (`stack-conventions` → *State management*) — flow into query params using the conventions above; changing a filter refetches.
- Export CSV is a frontend transform over already-fetched list data (or a dedicated `?format=csv` variant if a list is large) — and is permission-gated (`can('export:csv')`).

## Mock implementation notes

- Put deterministic-ish generators in `server/utils/mock/` seeded so data is stable within a session but varied across markets; bake in the JP weekly anomaly explicitly.
- Respect all query params in the mock (pagination, sort, filters) so the UI's controls are genuinely exercised, not decorative.
- Add the 200–500ms delay in a shared helper so it's consistent and easy to remove for tests.
- Keep one endpoint capable of returning an `ApiError` (e.g. a failed sync row / retry) to exercise the error + Toast + i18n path end to end.

## Checklist before an API-touching task is done

- New/changed endpoint uses the standard envelope (`ApiResponse` / `ApiListResponse` / `ApiCursorResponse`) and error shape.
- Types added/updated in `app/types/api.ts`; mock and consumers import them (no inline shapes).
- List endpoints honor page/pageSize/sort/order/q/filter/range params.
- An endpoint returning AI text takes `locale`, includes it in its query key, and has canned text in both locales.
- Timestamps ISO 8601. Monetary values are a **`Money` map (all 4 currencies), each aggregated server-side with historical daily official rates** (day-converted then summed — never functional-currency total × one rate); the client picks the display key, only formats (JPY 0-decimal downstream), and never converts. Responses carry `FxProvenance` for audit.
- Fetching goes through a query composable, not `$api`-in-component.
