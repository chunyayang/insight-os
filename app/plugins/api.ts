import axios, { type AxiosError, type AxiosInstance } from 'axios'
import type { ApiError } from '~/types/api'
import { extractApiError } from '~/utils/errors'

/**
 * The single Axios instance. ONLY Vue Query composables (composables/queries/) call it —
 * components never touch Axios directly. Exposed as `useNuxtApp().$api`.
 *
 * When the real backend replaces the Nitro mocks, only the baseURL changes here.
 */
export default defineNuxtPlugin(() => {
  // On the server '/api' has no origin to resolve against, so derive it from the request.
  const baseURL = import.meta.server ? `${useRequestURL().origin}/api` : '/api'

  const instance: AxiosInstance = axios.create({
    baseURL,
    timeout: 15_000,
  })

  // Request: attach the bearer token. The auth store (Phase 1e) will own this cookie;
  // reading it here keeps the interceptor working now and needs no rework later.
  const token = useCookie<string | null>('insight-token')
  instance.interceptors.request.use((config) => {
    if (token.value) {
      config.headers.Authorization = `Bearer ${token.value}`
    }
    return config
  })

  // Response: normalize ANY failure into a typed ApiError so components never parse raw
  // error bodies — they localize off `error.code`.
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<unknown>) => {
      // Handles both the contract shape and H3's createError wrapping (see extractApiError).
      const apiError: ApiError = extractApiError(error.response?.data) ?? {
        error: {
          code: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: error.message,
        },
      }

      // Integration point (Phase 1d/1f): surface a localized Toast keyed off
      // apiError.error.code once i18n + the PrimeVue Toast service are wired.

      return Promise.reject(apiError)
    },
  )

  return {
    provide: {
      api: instance,
    },
  }
})
