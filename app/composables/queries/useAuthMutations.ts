import { useMutation } from '@tanstack/vue-query'
import type { ApiResponse, LoginRequest, LoginResponse } from '~/types/api'

/**
 * Sign-in mutation. Components never call Axios directly — this is the seam.
 * On success it seeds the Pinia auth store (session/role/token); the token cookie is
 * then picked up automatically by the Axios request interceptor for later calls.
 */
export function useLoginMutation() {
  const { $api } = useNuxtApp()
  const auth = useAuthStore()

  return useMutation({
    mutationFn: async (payload: LoginRequest): Promise<LoginResponse> => {
      const response = await $api.post<ApiResponse<LoginResponse>>('/auth/login', payload)
      return response.data.data
    },
    onSuccess: (data) => {
      auth.signIn(data)
    },
  })
}
