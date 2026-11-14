# Customer journeys — GET /api/customers/:id/journeys

Part of the `/mock-api-contract` skill; read alongside its SKILL.md (envelope, `Money`, cursor paging).

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
- **Events are the customer's actions** (`/product-spec` → `spec.md` §4.5). Order statuses such as shipped or delivered describe the goods, so they are never events. The one exception is `subscription_renewed`, on the `system` channel: it shows lifetime value past the first purchase, where the subscription stopped, and the rhythm that forecasts recurring revenue.
- **An action on a purchase's orders stays in its journey.** Picking up an order or reviewing it is the tail of that shopping decision, so the server places it in the purchase's journey, after `checkout_completed`, however much later it happens. Any other action after a purchase, such as an `email_open`, belongs to the next journey. A closed journey can gain such an event at any time, and its place in the paging order doesn't move; the client shows it on its next refetch.
- **Every recognised event appears; an unrecognised one is dropped.** The client renders an event only when its `type` and `channel` are codes it knows, and filters out the rest, never showing a generic row: a row that can't say what happened is clutter, and it would display whatever its source sent. So a new type appears once it joins `JourneyEventType` and its label, never before. A journey left with no events is not shown; only the unfinished one can be, since a closed journey keeps its `checkout_completed`.
- **A session folds into one event.** Its page views become one `session` event with `pageViews`; the server does the folding.
- **Event times are the customer's local time** (`/product-spec` → `timezone-utc-buckets-for-mvp.md` §3). `occurredAt` carries the customer's offset and `timeZone` names its zone. Both are always present: where a source records no zone, such as an ad click or a proxied email open, the server takes it from the customer's nearest session event. The client formats `occurredAt` in `timeZone`, never in the browser's zone, so the server render and the client render agree. With its offset, `occurredAt` is still an exact instant.
- **Events record facts, never inferences.** `checkoutStep` and `rejectionCode` are what the checkout and the coupon engine logged: *Checkout abandoned · at shipping*, *Coupon rejected · below minimum spend*. Why the customer left is a reading of the whole timeline, often with more than one cause, so it is the AI summary's to say, never a field on an event.
- **A purchase is one shopping decision, which may be several orders** (`/product-spec` → `spec.md` §4.5). One checkout can create several, split by shop, shipping method or subscription items: one `checkout_completed` event names them all in `orderIds`. Several checkouts can be one decision, such as a supplementary order placed shortly after: the server joins the checkouts completed within its window (such as 30 minutes) into one purchase. Either way, the purchase closes one journey, and `orders` lists every order in it. Until the window passes, a closed journey can still gain an order; the client shows it on its next refetch.
- **A subscription renewal is not a purchase.** It is charged on a schedule, not by a decision, so `subscription_renewed` is an event like a review: it never closes a journey, and its order is in no journey's `orders` or `total`.
- **The journey's `total` is the server's sum of its orders,** never the client's. It renders by the dual-currency rule with the journey's `functionalCurrency`, or in the presentation currency alone when that is `null`: orders in different functional currencies make an aggregate, which has none (`/product-spec` → `currency-model.md` §3). Each `OrderSummary` is money on a record, with its own `functionalCurrency`.
- **The AI health summary above the timeline is a separate endpoint,** `GET /api/customers/:id/ai-summary?locale=` → `ApiResponse<AiSummary>`. A language switch refetches the summary only, and paging journeys never refetches the summary.
