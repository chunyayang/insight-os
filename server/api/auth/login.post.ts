import type { ApiResponse, LoginRequest, LoginResponse, Role } from '../../../app/types/api'

/**
 * Mock sign-in. The demo role picker seeds the session role so RBAC can be reviewed
 * without a real IdP; a short password deliberately fails so the error path
 * (inline alert + localized message) is exercisable end to end.
 *
 * Real credential/token handling, refresh, and SSO/2FA are later feature tickets.
 */
export default defineEventHandler(async (event): Promise<ApiResponse<LoginResponse>> => {
  const body = await readBody<LoginRequest>(event)
  await mockLatency('login')

  if (!body?.email || !body?.password) {
    throw apiError(400, 'VALIDATION_FAILED', 'Email and password are required.')
  }

  if (body.password.length < 6) {
    throw apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
  }

  const role: Role = body.role ?? 'admin'
  const profile = DEMO_USERS[role] ?? DEMO_USERS.admin

  return ok({
    // Opaque demo token — the client only forwards it via the $api plugin's request hook.
    token: `demo.${role}.${Date.now().toString(36)}`,
    user: { ...profile, email: body.email || profile.email, role },
  })
})
