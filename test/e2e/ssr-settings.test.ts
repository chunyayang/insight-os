import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * The layout fetches the org and user settings during SSR (`onServerPrefetch` + Vue Query's
 * `suspense()`) and hands them over in the payload, so the browser never requests them on a
 * page load. If that stops working the page still renders and the browser fetches them
 * itself, so nothing else fails: only a request count shows it.
 */
test.describe('Session settings from SSR', () => {
  test('a page load makes no settings request from the browser', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })
    await page.getByLabel('Email').fill('avery@insight-os.demo')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/^[^?]*\/$/)

    // Signing in navigates on the client, which fetches the settings in the browser; only
    // a full load is rendered on the server.
    const settingsPaths = ['/api/org/settings', '/api/me/settings']
    const settingsRequests: string[] = []
    page.on('request', (request) => {
      if (settingsPaths.includes(new URL(request.url()).pathname)) {
        settingsRequests.push(request.url())
      }
    })
    await page.reload()

    // The layout renders no page until both settings are in, so the Dashboard's data showing
    // means they are.
    await expect(page.getByText(/JP conversion rate down \d+%/)).toBeVisible()
    expect(settingsRequests).toEqual([])
  })
})
