import type { ApiError } from '~/types/api'
import { extractApiError } from '~/utils/errors'

/**
 * Wraps ApiError in a real Error so throwing it from the ofetch hooks below satisfies
 * eslint's throw-error rules while still passing isApiError()'s shape check.
 */
class ApiFetchError extends Error implements ApiError {
  error: ApiError['error']
  constructor(error: ApiError['error']) {
    super(error.message)
    this.error = error
  }
}

/**
 * The single $fetch instance. ONLY Vue Query composables (composables/queries/) call it —
 * components never touch it directly. Exposed as `useNuxtApp().$api`.
 *
 * When the real backend replaces the Nitro mocks, only the baseURL changes here.
 */
export default defineNuxtPlugin(() => {
  // On the server '/api' has no origin to resolve against, so derive it from the request.
  const baseURL = import.meta.server ? `${useRequestURL().origin}/api` : '/api'
  const token = useCookie<string | null>('insight-token')

  const api = $fetch.create({
    baseURL,
    timeout: 15_000,
    // The hooks below always throw before ofetch's own retry logic runs, but pin this
    // explicitly too — a hook that ever returns instead of throwing would silently
    // re-enable ofetch's default retries (1 retry on GET for 408/409/425/429/5xx).
    retry: false,

    onRequest({ options }) {
      if (token.value) {
        options.headers.set('Authorization', `Bearer ${token.value}`)
      }
    },

    // Response came back with an error status — normalize ANY failure into a typed
    // ApiError so components never parse raw error bodies; they localize off `error.code`.
    onResponseError({ response }) {
      // Handles both the contract shape and H3's createError wrapping (see extractApiError).
      const apiError: ApiError = extractApiError(response._data) ?? {
        error: { code: 'NETWORK_ERROR', message: response.statusText || 'Request failed' },
      }

      // Deliberately silent: the toast is raised once, at the cache level, by
      // plugins/vue-query.ts. Notifying here too would double every message and
      // put UI concerns in the transport layer.
      throw new ApiFetchError(apiError.error)
    },

    // Request never got a response at all: timeout or network failure. ofetch marks its
    // own timeout aborts with `name: 'TimeoutError'`; anything else here is a genuine
    // network failure (the platform fetch's native TypeError).
    onRequestError({ error }) {
      throw new ApiFetchError({
        code: error.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: error.message,
      })
    },
  })

  return {
    provide: {
      api,
    },
  }
})
