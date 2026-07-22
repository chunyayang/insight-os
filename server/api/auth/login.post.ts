import type { ApiResponse, LoginRequest, LoginResponse, Role } from '../../../app/types/api'

const DEMO_USERS: Record<Role, { id: string; name: string; email: string }> = {
  admin: { id: 'u-001', name: 'Avery Chen', email: 'avery.chen@insight-os.demo' },
  analyst: { id: 'u-002', name: 'Jordan Miles', email: 'jordan.miles@insight-os.demo' },
  viewer: { id: 'u-003', name: 'Sam Okafor', email: 'sam.okafor@insight-os.demo' },
}

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
    // Opaque demo token — the client only forwards it via the Axios interceptor.
    token: `demo.${role}.${Date.now().toString(36)}`,
    user: { ...profile, email: body.email || profile.email, role },
  })
})
