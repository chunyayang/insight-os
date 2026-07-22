import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * The one end-to-end happy path: sign in, land on the Dashboard, and see real data.
 *
 * This is the only place the whole stack runs together in a browser — middleware,
 * Pinia session, Axios, Vue Query, Chart.js, i18n and the design tokens. Deliberately
 * one flow, not exhaustive coverage (see testing-and-ci).
 */
test.describe('Insight OS smoke', () => {
  test('signs in and renders the dashboard with the JP anomaly', async ({ page, goto }) => {
    // Unauthenticated users are bounced to login by the global guard.
    await goto('/', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/login/)

    await page.getByLabel('Email').fill('avery@insight-os.demo')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Lands on the dashboard.
    await expect(page).toHaveURL(/^[^?]*\/$/)
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // KPI tiles resolve past their skeletons. `exact` matters: each label also appears
    // inside its sparkline's accessible caption ("14-day trend for …").
    await expect(page.getByText("Today's Revenue", { exact: true })).toBeVisible()
    await expect(page.getByText('Conversion Rate', { exact: true })).toBeVisible()

    // The seeded anomaly is surfaced with its AI hand-off.
    const alert = page.getByText(/JP conversion rate down \d+%/)
    await expect(alert).toBeVisible()
    await expect(page.getByRole('link', { name: /Ask AI why/ }).first()).toBeVisible()
  })

  test('blocks a viewer from an admin-only route', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })

    await page.getByLabel('Email').fill('sam@insight-os.demo')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.getByRole('button', { name: 'Viewer' }).click()
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // *(Hidden)* means the nav entry is gone…
    await expect(page.getByRole('link', { name: 'Team' })).toHaveCount(0)

    // …and the route itself refuses, redirecting home.
    await page.goto('/team')
    await expect(page).toHaveURL(/^[^?]*\/$/)
  })

  test('switches language and theme without losing the session', async ({ page, goto }) => {
    await goto('/login', { waitUntil: 'hydration' })
    await page.getByLabel('Email').fill('avery@insight-os.demo')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

    // Dark mode is a class on <html>, persisted in a cookie.
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // zh-TW swaps copy in place (no_prefix keeps the URL stable).
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: '繁體中文' }).click()
    await expect(page.getByRole('heading', { name: '儀表板', level: 1 })).toBeVisible()
  })
})
