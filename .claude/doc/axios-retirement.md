# Retire Axios in favor of `$fetch`

> **Status:** Settled. Landed in `chore(api): replace Axios with $fetch in the API plugin and query
> composables (#92)`. Axios is gone from `package.json` and from installs entirely.

## Decision

`$api` (`app/plugins/api.ts`) is a `$fetch.create()` instance, not an Axios instance. Axios is not
a dependency of this app.

## Why

Nuxt's own `$fetch` docs call it "the preferred way to make HTTP calls in Nuxt instead of
`@nuxt/http` and `@nuxtjs/axios`," and Axios is discouraged by Nuxt's official guidelines. The
retirement brings the app in line with that guidance; the retired `vi.mock('axios', …)` test
workaround was a symptom of the mismatch, not the reason for the move.

## Consequence

The transport swap is mechanical, but four things behave differently from Axios and are worth
not re-deriving from ofetch's source.

### Hook mapping

| Axios | ofetch (`$fetch.create`) |
|---|---|
| request interceptor | `onRequest({ request, options })` |
| response interceptor, failure branch with `error.response` | `onResponseError({ response })` |
| failure branch without a response (timeout, network) | `onRequestError({ error })` |
| `ECONNABORTED` → `TIMEOUT` | `error.name === 'TimeoutError'` → `TIMEOUT`, anything else → `NETWORK_ERROR` |

ofetch hooks are side-effecting, not value-replacing, so the error hooks must **throw**. A hook
that returns falls through to ofetch's own `FetchError`, which loses the `ApiError` shape every
caller and the global toast pipeline depend on.

### Retries are on by default

ofetch retries a GET once on 408/409/425/429/500/502/503/504; Axios never retried. The hooks above
throw before that logic runs, and `retry: false` is pinned as a second guard — protect both if the
plugin is ever "simplified." The `TimeoutError` check assumes no call passes its own `signal`; one
that does would be misclassified as `NETWORK_ERROR`.

### `baseURL` stays relative, on the server too

Nitro's `$fetch` (which `.create()` inherits as its underlying fetch) sends any request whose
resolved URL starts with `/` straight into the in-process handler, skipping the network. An
origin-qualified `baseURL` produces a URL that does not start with `/`, so every SSR call would
make a real HTTP round trip to itself. Keep `baseURL: '/api'`.

It also keeps the server from deriving the API origin from the incoming `Host` header
(`useRequestURL().origin`), which a forged `Host` could steer.

### The bearer token is scoped to the API base

ofetch runs `onRequest` before joining `baseURL`, and its `withBase()` passes any URL carrying a
protocol through untouched. An absolute URL or a per-call `baseURL` override would therefore carry
the user's token to another origin. The hook attaches it only when the call resolves under
`API_BASE_URL`, using ufo's `hasProtocol` — the same check `withBase` makes. `test/nuxt/api.test.ts`
pins this down; Axios had the same exposure through `allowAbsoluteUrls`.

### Axios stays out of the install tree

pnpm kept resolving axios as the optional peer of `@vueuse/integrations` (pulled in by `@nuxt/ui`,
for a `useAxios` this app never calls). The scoped override `'@vueuse/integrations>axios': '-'` in
`pnpm-workspace.yaml` drops that edge. If a future `pnpm install` brings axios back, that override
is the first place to look.

## Considered and rejected: `useRequestFetch()` as the base

`useRequestFetch()` returns the global `$fetch` on the client and `event.$fetch` on the server.
`event.$fetch` is h3's `fetchWithEvent`, which merges `event.context` and the inbound request's
headers into every call: all of them except `accept`, `accept-encoding`, `connection`,
`keep-alive`, `upgrade`, `expect` and `transfer-encoding` — and `host` too, unless the path starts
with `/`, so every `/api` call forwards it. Checked against Nuxt, Nitro and h3 source:

- It would reopen the leak the bearer-token scoping above closes. The merge runs for any URL,
  before ofetch joins `baseURL`, so an absolute URL or a per-call `baseURL` override would carry the
  whole inbound `Cookie` header — `insight-token` included, which is not `httpOnly` — to another
  origin during SSR. The `onRequest` guard only governs `Authorization`; it never sees these.
- It forwards every ambient header to the API layer, replacing the narrow, explicit "one cookie →
  one `Authorization` header" translation with a broad, implicit one. The explicit translation
  would still be needed, because a bearer-token backend does not read the raw cookie.
- Forwarding has no consumer today: the only inbound header `server/` reads is `Authorization`
  (`server/api/settings/org.patch.ts`), which `$api` already sets itself.
- It keeps the in-process shortcut — the `fetch` it wraps is the same Nitro `$fetch` — so it adds
  nothing to the `baseURL` question above.
- On the client it is identical to the global `$fetch`.

Revisit only when a server route needs something from the inbound request:

- **One header** (for example `Accept-Language`): keep `$fetch.create()`, read that header with
  `useRequestHeaders(['accept-language'])` in the plugin, and set it in `onRequest` under the same
  base check. This is per-request safe because SSR instantiates plugins per request.
- **`event.context`:** there is no narrow equivalent, so this is the real trigger to reopen the
  decision. `useRequestFetch().create({ … })` is not the swap — on the server `event.$fetch` is a
  bare function with no `.create()` — and the cookie forwarding above has to be solved first.

`useFetch`/`useAsyncData` are not used: Vue Query owns server data here (see `/stack-conventions`),
so `$api` is called from query composables only.
