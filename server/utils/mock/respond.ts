import type { ApiListResponse, ApiResponse, ResponseMeta } from '../../../app/types/api'
import { seededRange } from './seed'

/**
 * Artificial latency (200–500ms) so loading skeletons genuinely render and are testable.
 * Centralised here so it's consistent across endpoints and trivial to disable in tests.
 */
export async function mockLatency(key = 'default'): Promise<void> {
  if (process.env.MOCK_NO_LATENCY === '1') return
  const ms = seededRange(`lat:${key}:${Date.now() >> 12}`, 200, 500)
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function meta(): ResponseMeta {
  return {
    requestId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
  }
}

/** Wrap a single resource in the standard envelope. Never return a bare object. */
export function ok<T>(data: T): ApiResponse<T> {
  return { data, meta: meta() }
}

/** Wrap a page of rows in the standard list envelope. Never return a bare array. */
export function okList<T>(
  rows: T[],
  page: number,
  pageSize: number,
  total: number,
): ApiListResponse<T> {
  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    meta: meta(),
  }
}

/**
 * Standard error. Thrown via createError so Nitro emits the right HTTP status with the
 * contract's `{ error: { code, message } }` body — which the Axios interceptor turns into
 * a typed ApiError and the UI localizes off `code`.
 */
export function apiError(status: number, code: string, message: string, details?: unknown) {
  return createError({
    statusCode: status,
    data: { error: { code, message, details } },
  })
}
