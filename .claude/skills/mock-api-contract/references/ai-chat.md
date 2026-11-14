# AI Assistant endpoint — POST /api/ai/chat

Part of the `/mock-api-contract` skill; read alongside its SKILL.md (envelope, *AI text and locale*).

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
