import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'

/**
 * URL-backed filters — the pure half.
 *
 * Data-scope filters (market, segment, status, range, …) live in the URL, not in Pinia:
 * the URL is the one place that survives a refresh, a shared link and the back button.
 * See `.claude/doc/url-backed-filters.md` for why this replaced a global Pinia filter.
 *
 * Two rules are encoded here, and both matter:
 *   - A value equal to the default is REMOVED from the query, so a page that isn't
 *     filtered has a clean URL rather than `?market=All&segment=all&page=1`.
 *   - Anything read back is validated against the allowed set. A query string is
 *     user-editable input: `?market=XX` must land on the default, never reach a query
 *     key or the wire.
 */

/** A query value as vue-router hands it over: string, null, or repeated (`?a=1&a=2`). */
type RawQueryValue = LocationQueryValue | LocationQueryValue[] | undefined

/**
 * Narrow one raw query value to a member of `allowed`, else the fallback.
 *
 * A repeated param takes its first entry rather than failing — `?market=JP&market=US`
 * is a malformed link, not something worth erroring a page over.
 */
export function readFilterParam<T extends string>(
  raw: RawQueryValue,
  allowed: readonly T[],
  fallback: T,
): T {
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first !== 'string') return fallback
  return (allowed as readonly string[]).includes(first) ? (first as T) : fallback
}

/**
 * The next query object for a filter change: the value written, or the key dropped
 * entirely when it matches the default.
 *
 * Returns a new object — the caller hands it to router.push/replace, and mutating
 * `route.query` in place would not trigger navigation.
 */
export function writeFilterParam<T extends string>(
  query: Readonly<Record<string, RawQueryValue>>,
  key: string,
  value: T,
  fallback: T,
): LocationQueryRaw {
  const next: LocationQueryRaw = {}
  for (const [k, v] of Object.entries(query)) {
    if (k !== key) next[k] = v
  }
  if (value !== fallback) next[key] = value
  return next
}
