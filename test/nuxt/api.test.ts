import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useAuthStore } from '../../app/stores/auth'

const TOKEN = 'demo.admin.stamp'

// Echo the Authorization header back, so each test can see what $api actually sent.
const echoAuth = (event: { headers: Headers }) => ({
  authorization: event.headers.get('authorization'),
})

registerEndpoint('/api/echo', echoAuth)
registerEndpoint('https://other.example/echo', echoAuth)

type Echo = { authorization: string | null }

/**
 * The plugin's `insight-token` ref learns of the store's writes through a cookieStore
 * `change` event, which browsers fire on a document.cookie write but happy-dom does not.
 */
async function announceTokenCookie(value: string | null) {
  await nextTick() // flush the store's cookie watcher, which writes document.cookie
  const entry = { name: 'insight-token', value }
  const change = Object.assign(new Event('change'), {
    changed: value === null ? [] : [entry],
    deleted: value === null ? [entry] : [],
  })
  ;(globalThis as unknown as { cookieStore: EventTarget }).cookieStore.dispatchEvent(change)
}

/** Confirms the token really reaches the API first — otherwise the "withheld" cases
 *  below would pass merely because no token was ever sent. */
async function signInAndSync() {
  useAuthStore().signIn({
    token: TOKEN,
    user: { id: 'u-1', name: 'Test User', email: 't@x.com', role: 'admin' },
  })
  await announceTokenCookie(TOKEN)
  await vi.waitFor(async () => {
    const res = await useNuxtApp().$api<Echo>('/echo')
    expect(res.authorization).toBe(`Bearer ${TOKEN}`)
  })
}

describe('$api bearer token', () => {
  afterEach(async () => {
    useAuthStore().signOut()
    await announceTokenCookie(null)
  })

  it('is attached to requests routed through the API baseURL', async () => {
    await signInAndSync()
  })

  it('is withheld from an absolute URL that bypasses the baseURL', async () => {
    await signInAndSync()
    const res = await useNuxtApp().$api<Echo>('https://other.example/echo')
    expect(res.authorization).toBeNull()
  })

  it('is withheld when a call overrides the baseURL', async () => {
    await signInAndSync()
    const res = await useNuxtApp().$api<Echo>('/echo', { baseURL: 'https://other.example' })
    expect(res.authorization).toBeNull()
  })
})
