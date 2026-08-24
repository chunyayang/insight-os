# Currency model

**Status:** Settled — 2026-08-24. Supersedes the monetary-sort rule recorded on 2026-08-22
(commit `e661e2d`, product spec PR #2, issue #40), which is withdrawn; see *Sorting* below.

This is the single authority on how money is represented, displayed, and sorted. The rules were
previously spread across the product spec (§2, §4.5, §4.6, §4.10), `/mock-api-contract`,
`/stack-conventions`, and inline comments — four places that had to agree and twice didn't. Those
now carry one-line pointers here. **Change this document first; propagate outward second.**

What does *not* live here: the wire format of `Money` and `FxProvenance` (that is
`/mock-api-contract`, which owns the contract) and the mechanics of `useFormat`.

---

## 1. Terminology

Aligned with IAS 21, so the words mean outside this codebase what they mean inside it:

| Term | Definition | Where it comes from |
|---|---|---|
| **Local currency** | The currency a figure was transacted in. Per *record*, not per page. | The record's market, today (`MARKET_NATIVE_CURRENCY`); see §6 for where that breaks. |
| **Reporting currency** | The currency the organization expresses normalized cross-market figures in. | Settings→General *default currency*; `USD` when unconfigured. |
| **Settlement currency** | The currency a specific contract settles in — a supplier paid in USD regardless of market. | The contract. Not modelled yet; see §6. |

"Local currency" replaces **"native currency"** throughout. `nativeCurrency` on the wire and in
`app/types/api.ts` is unchanged for now — the rename is a separate mechanical change so this
decision does not sit behind a 15-file refactor. Until it lands, `nativeCurrency` *is* the local
currency, and new prose should say "local".

Note the two senses of "settlement": the organization's reporting currency is **not** a settlement
currency. Row C below is the only place the word carries its contractual meaning.

## 2. The design matrix

Not every amount wants the same treatment. Three categories, by what the number is *for*:

| | Category | Examples in this product | Display | Why |
|---|---|---|---|---|
| **A** | Macro & operational | Daily revenue, AOV, refund totals | Multi-currency switching — the Analytics selector | Executives and regional GMs switch between the global view and one market at will. |
| **B** | User & acquisition | Customer LTV, campaign budget/spend, ROAS | **Dual currency in one cell** — reporting primary, local secondary | Needs global ranking and ROI comparison *and* the raw local figure for market-level work. |
| **C** | Logistics & supply chain | Procurement cost, freight, customs duty | Settlement currency, fixed — does not follow any front-end switch | A supplier contract in USD is USD. Margin is computed server-side by converting revenue *into* the cost currency, never the reverse. |

Two principles behind the split:

- Anything that is **compared, ranked, or aggregated across borders** must have at least one figure
  in a single unified currency at the data layer.
- Anything used for **reconciliation, customer contact, or local market judgement** must show the
  **local** currency on screen.

Category B is the one that changed. It used to be local-only, which made every cross-market
ranking meaningless. **Category C does not exist in the MVP** — no module has procurement,
freight, customs or CAC (Campaigns has budget/spend/ROAS, which is category B). It is recorded as a
principle, with a real modelling gap flagged in §6.

## 3. Display rules

- **Analytics** owns the only currency *selector*. It normalizes markets onto one currency for
  comparison, initializes from the reporting currency, and is then owned by the user's session
  selection. It is UI state in Pinia — seeding from an org setting is not licence to mirror server
  data into Pinia.
- **Everywhere else** there is no selector. Category A figures (Dashboard KPI cards) render in the
  record's **local** currency. Category B figures render **dual**:

  ```
  $15,230.00 USD     ← reporting currency, primary: larger, medium weight
  ¥1,650,000 JPY     ← local currency, secondary: smaller, --ui-text-muted
  ```

- **Suppress the secondary line when local == reporting.** A US customer under a USD reporting
  currency shows one line, not the same number twice.
- Records whose market is `All` have `USD` as their local currency, so they too collapse to one
  line under a USD reporting currency.
- Two stacked lines, never two columns: a second column costs horizontal space that narrow
  viewports do not have, and the pairing is what makes the cell readable.
- The `Money` map already carries all four currencies per record, so the second line is a second
  key read. **No API change, no extra request, no client-side conversion** — the client still only
  ever picks a key and formats it.
- CSV export carries **both** amounts and **both** currency codes as separate raw columns. A cell
  that renders two numbers must not export as one.

### What this costs

The reporting currency is set in Settings and now determines the *primary* figure on pages that
have no currency control. That knowingly weakens the older guarantee that "a control not visible on
a page never alters that page's numbers" — reworded, not silently dropped. It survives in the form
that matters: the Analytics **selector** still changes nothing outside Analytics. The reporting
currency is deliberate org configuration rather than a floating per-page control, it changes rarely,
and the local figure stays visible underneath, so nothing is hidden from the user.

## 4. Sorting

**A monetary column sorts on the reporting-currency amount, always.** The sort control is live
regardless of the market filter.

This replaces the rule recorded on 2026-08-22 — that the control should be inert while the market
filter is on `All`, with a tooltip. That rule correctly identified the problem (ranking raw local
numbers across markets is noise: a JPY total always outranks a EUR one) but answered it by taking
the feature away. Sorting on a currency every row shares makes the cross-market ranking *correct*
instead of unavailable, and it costs less code than gating did.

**State the sort currency in the column header or its tooltip.** This is not decoration — see below.

### Sorting by reporting currency is not identical to sorting by local currency

A tempting shortcut says that within a single market the two orderings must match, since one is the
other times a constant. **That is false here**, and the reason is the financial-integrity rule:
every day is converted at that day's rate and then summed, so a record's USD total and its JPY
total are independent aggregates over a differently-weighted mix of days. Each record ends up with
its own implied blended rate. There is no constant.

Measured against the mock pool over 180 simulated days, comparing the two rankings **within one
market**:

- **130 of 180 days** contain at least one pair that ranks differently
- 190 disagreeing pairs in total, ~0.05% of all pairs compared
- Blended rates spread **0.25% (JP)**, 0.14% (TW/DE) across customers in one market

```
2026-08-23, JP market
  cus_0022   278,150 JPY   $1,771.68
  cus_0094   278,168 JPY   $1,770.34   ← higher in JPY, lower in USD
```

Hairline — it only bites on rows within a fraction of a percent of each other — but it has a
visible consequence. In a cell stack sorted on the primary line, the grey secondary line will
occasionally read out of order, and that looks like a rendering bug. Saying which currency the sort
ran on is what makes it legible instead. **Do not "fix" it** by re-sorting formatted strings client
side, or by deriving one currency from another; both are prohibited elsewhere in this document for
the same underlying reason.

## 5. Scaling past four currencies

Today every monetary endpoint returns all four currencies up front. That is what makes the
Analytics toggle instant with no refetch, and at four currencies the payload cost is negligible.

At roughly 20+ currencies that trade inverts and the response bloats. The upgrade path does **not**
require rebuilding: add `currency` to the **Vue Query key** and fetch on demand. That yields
on-demand loading, memoised switching between already-visited currencies, and correct eviction when
the date range changes (already part of the key) — with no cache code of our own.

Do **not** implement this as a hand-rolled merge of fetched currencies into a front-end array. It
duplicates what Vue Query already does and breaks the state boundary: Vue Query owns server data,
Pinia owns UI state. The trade being accepted at that point is the instant toggle; that is the
whole cost, and it is not worth paying before the payload actually hurts.

## 6. Known gap: category C is not modelled

Category C is a schema problem, not a display rule, and nothing in the MVP needs it yet:

- `nativeCurrency` is derived from the record's **market**. A settlement currency is a property of a
  **contract** — a JP-market product can settle in USD — so it cannot be derived this way.
- `Money` has exactly four keys, the four market currencies. A supplier paid in CNY has nowhere to
  live in the map at all.

Whoever builds the first cost or margin surface must resolve both before writing display code.
Bolting a fifth key onto `Money` is not the answer; the currency needs to come from the record.

## Related

- `/mock-api-contract` — `Money`, `FxProvenance`, the day-by-day conversion contract
- `/stack-conventions` — table and state-boundary conventions
- Product spec §2, §4.5, §4.6, §4.10 (separate `insight-os-doc` repo)
