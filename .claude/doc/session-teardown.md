# Session teardown: a new page on sign-out, a reset on a role switch

> **Status:** Settled 2026-11-27, for #162. `useAuth()` (`app/composables/useAuth.ts`) owns both.

## Decision

- **Sign-out** clears the session cookies, then loads `/login` as a new page with
  `navigateTo('/login', { external: true })`.
- **A role switch** rewrites the role cookie, then calls `resetQueries` on every query except the
  org and user settings, and re-runs the route guard with a forced same-location `navigateTo`.

## Why sign-out loads a new page instead of clearing the cache in place

The obvious fix for #162 was `cancelQueries()` + `clear()` during a client-side sign-out. It can't
be done reliably while the shell is mounted, and there is no point at which it isn't:

- **The auth cookies must be cleared before navigating.** The route guard sends a signed-in user
  from `/login` back to `/`, so the session is gone while the old page is still on screen.
- **Clearing the session changes live query keys.** With no user, the user-settings key empties,
  `defaultMarket` falls back to `'All'`, and the dashboard summary key moves with it. Vue Query
  applies the change from a `pre`-flush watcher, so the new request goes out at the next flush,
  with no token. If the next flush is an `await cancelQueries()`, the request starts after the
  cancel has already run, and nothing cancels it.
- **`clear()` under mounted observers leaves them orphaned.** They keep their last result and
  point at queries the cache no longer holds. Anything that updates them before the page unmounts
  creates a new entry, so the cache can end up refilled after the clear. `navigateTo` awaits the
  middleware and the login chunk, so that window exists, and `await navigateTo()` doesn't
  guarantee the layout has unmounted.

A full page load avoids all three. It also clears page memory and the AI conversation, and any
client state added later, without anyone listing it. An in-app teardown is a list of things to
clear, and a list goes stale. The cost is one server-rendered page load on a rare action. Theme
and locale are cookies and survive.

**`await nextTick()` before leaving is load-bearing, and has a test.** `useCookie` writes
`document.cookie` from a watcher. Leaving first sends the old token, and the guard redirects
`/login` to `/`. `navigateTo` with `external` also flushes pending cookie writes itself, but
through `nuxtApp._cookieWriters`, which is internal and undocumented, so `signOut()` doesn't
rely on it.

**`navigateTo` with `external`, not `reloadNuxtApp`.** Both set `location.href`, but
`reloadNuxtApp` is for recovering the app. It skips a second reload to the same path within ten
seconds (a loop guard that needs `force: true` to get past) and keeps its bookkeeping in
`sessionStorage`. Sign-out is a plain navigation out of the app, with none of that.

## Why a role switch resets the data and keeps the settings

A role switch keeps the token, so the user and organization stay the same. Settings belong to
them, not to the role, so dropping the settings would be wrong, not only slower. Dropping them
would also blank the page: the layout renders nothing until both settings queries settle.

The data queries are reset with `resetQueries`, not `removeQueries`. The page stays mounted, and
removing its entries would orphan its observers as above: they would keep showing the previous
role's data with no refetch. `resetQueries` returns each entry to its initial state, refetches
the ones on screen, and leaves the rest empty, so no page renders the previous role's data.

The rejected alternative was adding the role to every query key. It has the same flaw #162
records for adding the user: old entries stay in memory, and every key factory has to remember.

## Consequences

- Against today's mock, which doesn't scope data by role, a role switch refetches identical data
  behind a skeleton. That is accepted for a demo control.
- When the backend scopes data by role, `switchRole` must get a re-issued token and write it with
  `signIn` before the reset. A reset before that would refetch with the old role's token.
- Page memory (#69) and the AI conversation add their `clearNuxtState` calls to `switchRole`.
  Sign-out needs nothing more.
