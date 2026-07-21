import {
  VueQueryPlugin,
  QueryClient,
  hydrate,
  dehydrate,
  type DehydratedState,
} from '@tanstack/vue-query'

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
  const queryClient = new QueryClient({
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
