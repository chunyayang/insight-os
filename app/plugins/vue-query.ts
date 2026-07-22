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
   */
  function notifyError(error: unknown) {
    if (!import.meta.client) return
    const toast = nuxt.vueApp.config.globalProperties.$toast
    const translate = nuxt.vueApp.config.globalProperties.$t
    if (!toast || typeof translate !== 'function') return

    toast.add({
      severity: 'error',
      summary: translate('common.states.error'),
      detail: translate(errorKey(error)),
      life: 5000,
    })
  }

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: notifyError }),
    mutationCache: new MutationCache({ onError: notifyError }),
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
