import type { MaybeRefOrGetter, WritableComputedRef } from 'vue'
import { readFilterParam, writeFilterParam } from '~/utils/urlFilter'

export interface UrlFilterOptions {
  /**
   * How the change enters history. `push` for a deliberate, discrete choice the user
   * would expect the back button to undo (picking a market); `replace` for refinements
   * that fire repeatedly — a debounced search box must not leave 20 history entries
   * between the user and the previous page.
   */
  mode?: 'push' | 'replace'
}

/**
 * One data-scope filter, stored in the URL query.
 *
 * Reads and writes look like a plain ref, so a control can `v-model` it, but the source
 * of truth is the route: the value survives a refresh, travels in a shared link, and the
 * back button walks it. Deliberately NOT mirrored into Pinia — a copy in a store is a
 * second source of truth, which is the problem this composable exists to remove.
 *
 * `fallback` is the value used when the param is absent or invalid, and the value whose
 * presence is elided from the URL. Pass a getter to track a reactive default (e.g. the
 * session's default operating market).
 */
export function useUrlFilter<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: MaybeRefOrGetter<T>,
  options: UrlFilterOptions = {},
): WritableComputedRef<T> {
  const route = useRoute()
  const router = useRouter()
  const mode = options.mode ?? 'push'

  return computed({
    get: () => readFilterParam(route.query[key], allowed, toValue(fallback)),
    set: (value) => {
      const query = writeFilterParam(route.query, key, value, toValue(fallback))
      // Navigation is fire-and-forget: the computed re-reads from the route once it lands.
      void router[mode]({ query })
    },
  })
}
