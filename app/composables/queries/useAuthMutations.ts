import { useMutation } from '@tanstack/vue-query'
import type { ApiResponse, LoginRequest, LoginResponse } from '~/types/api'

/**
 * Sign-in mutation. Components never call $api directly — this is the seam.
 * On success it seeds the Pinia auth store (session/role/token); the token cookie is
 * then picked up automatically by the $api plugin's request hook for later calls.
 */
export function useLoginMutation() {
  const { $api } = useNuxtApp()
  const auth = useAuthStore()

  return useMutation({
    // The login form renders the failure inline, with dedicated copy for bad
    // credentials — the global toast would say the same thing a second time.
    meta: { silent: true },
    mutationFn: async (payload: LoginRequest): Promise<LoginResponse> => {
      const response = await $api<ApiResponse<LoginResponse>>('/auth/login', {
        method: 'POST',
        body: payload,
      })
      return response.data
    },
    onSuccess: (data) => {
      auth.signIn(data)
    },
  })
}
