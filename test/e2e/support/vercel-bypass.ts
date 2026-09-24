import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { request } from '@playwright/test'

export const BYPASS_STATE = '.playwright/vercel-bypass.json'

/**
 * Previews sit behind Vercel Deployment Protection. One request carrying the automation
 * bypass secret gets a bypass cookie back; every test then starts from that cookie, so
 * the secret itself is never attached to a page's requests.
 */
export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  if (!baseURL) return
  if (!secret) throw new Error('E2E_BASE_URL is set but VERCEL_AUTOMATION_BYPASS_SECRET is not')

  const context = await request.newContext({ baseURL })
  const response = await context.get('/', {
    headers: { 'x-vercel-protection-bypass': secret, 'x-vercel-set-bypass-cookie': 'true' },
  })
  // An accepted secret sets the cookie on a redirect back to the same URL; a refused one
  // redirects to Vercel's SSO login, so where the redirects end is the verdict.
  const landed = new URL(response.url())
  if (!response.ok() || landed.host !== new URL(baseURL).host) {
    throw new Error(`Bypass refused: ${baseURL} ended at ${landed.origin}${landed.pathname}`)
  }

  await mkdir(dirname(BYPASS_STATE), { recursive: true })
  await context.storageState({ path: BYPASS_STATE })
  await context.dispose()
}
