import {
  VueQueryPlugin,
  QueryClient,
  QueryCache,
  MutationCache,
  hydrate,
  dehydrate,
  type DehydratedState,
} from '@tanstack/vue-query'
import { errorKey } from '~/utils/errors'

/**
 * Vue Query — owner of ALL server data (Pinia never clones server state).
 *
 * Wires the standard Nuxt SSR hydration handshake: the server dehydrates the cache
 * into Nuxt payload state after render, and the client hydrates from it — so data
 * fetched during SSR isn't re-fetched on the client's first paint.
 *
 * Default staleTime is 60s for analytics data (see stack-conventions). Per-query
 * key factories live with each domain composable in composables/queries/.
 */
export default defineNuxtPlugin((nuxt) => {
  /**
   * One place where every query/mutation failure becomes a localized Toast.
   *
   * Doing it at the cache level (rather than in the Axios interceptor) keeps the
   * transport layer free of UI concerns and means no caller can forget to surface an
   * error. Copy is keyed off `error.code`; the raw server message is never shown.
   * Client-only — there is no Toast during SSR.
   *
   * `runWithContext` is required because this fires from a cache callback, outside any
   * component setup: without it `useNotify`'s `useToast()` has no Nuxt instance to bind
   * to. (Its translation deliberately does not go through `useI18n()` for the same
   * reason — see the comment in useNotify.ts.)
   *
   * Opt out per query/mutation with `meta: { silent: true }` where the surface already
   * renders the failure itself, so the user isn't told twice. Login is the one case.
   */
  function notifyError(error: unknown, meta?: Record<string, unknown>) {
    if (!import.meta.client || meta?.silent) return
    nuxt.runWithContext(() => useNotify().error(errorKey(error)))
  }

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => notifyError(error, query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => notifyError(error, mutation.meta),
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  })

  nuxt.vueApp.use(VueQueryPlugin, { queryClient })

  const vueQueryState = useState<DehydratedState | null>('vue-query')

  if (import.meta.server) {
    nuxt.hooks.hook('app:rendered', () => {
      vueQueryState.value = dehydrate(queryClient)
    })
  }

  if (import.meta.client) {
    hydrate(queryClient, vueQueryState.value)
  }
})
