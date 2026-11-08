import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * A deployment runs several server instances, so the mock keeps settings in the
 * browser's cookies, never in one instance's memory. Clearing the cookies must lose
 * the saved value: if it survives, some instance is holding it, and a request routed
 * to any other instance would read the default instead.
 */
test.describe('Mock settings persistence', () => {
  test('a saved market lives in the browser, not on the server', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })
    await page.locator('input[type=email]').fill('avery@insight-os.demo')
    await page.locator('input[type=password]').fill('secret123')
    await page.locator('button[type=submit]').click()
    await expect(page).toHaveURL(/^[^?]*\/$/)

    const token = (await page.context().cookies()).find((c) => c.name === 'insight-token')
    const authorization = `Bearer ${decodeURIComponent(token!.value).replace(/"/g, '')}`
    const readMarket = async () => {
      const res = await page.request.get('/api/settings/me', { headers: { authorization } })
      return (await res.json()).data.defaultMarket
    }

    await page.request.patch('/api/settings/me', {
      headers: { authorization },
      data: { defaultMarket: 'TW' },
    })
    expect(await readMarket()).toBe('TW')

    // A full load renders on the server, which must read the same cookie.
    await page.goto('/settings')
    await expect(page.locator('main [role=combobox]').first()).toContainText(/Taiwan|台灣/)

    await page.context().clearCookies({ name: /^insight-mock-/ })
    expect(await readMarket()).toBe('All')
  })
})
