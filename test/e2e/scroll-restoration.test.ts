import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * From `lg` the shell is pinned and pages scroll inside the panel's body, so the layout
 * restores that scroll itself; Nuxt's scrollBehavior only moves the window. The restore
 * leans on Nuxt UI's `[data-slot="body"]` and Vue Router's `history.state.position`, and an
 * upgrade that changes either fails silently: back/forward just lands at the top.
 */
test.describe('Shell scroll restoration', () => {
  // Below `lg` the window scrolls and Nuxt restores it, so there is nothing of ours to test.
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'the panel body scrolls only from lg')

  const body = (page: Page) => page.locator('main')
  const scrollTop = (page: Page) =>
    body(page).evaluate((main) => main.closest('[data-slot="body"]')!.scrollTop)
  const scrollTo = async (page: Page, top: number) => {
    await body(page).evaluate(
      (main, top) => main.closest('[data-slot="body"]')!.scrollTo({ top }),
      top,
    )
    await expect.poll(() => scrollTop(page)).toBe(top)
  }

  test('a new page starts at the top and back/forward returns to where it was left', async ({
    page,
    goto,
  }) => {
    await goto('/login', { waitUntil: 'hydration' })
    await page.getByLabel('Email').fill('avery@insight-os.demo')
    await page.getByLabel('Password', { exact: true }).fill('secret123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Scroll only once the data is in, so skeletons can't change the height underneath.
    await expect(page.getByText(/JP conversion rate down \d+%/)).toBeVisible()
    await scrollTo(page, 300)

    await page.getByRole('link', { name: 'Customers', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible()
    await expect(page.getByRole('row').nth(5)).toBeVisible()
    await expect.poll(() => scrollTop(page)).toBe(0)
    await scrollTo(page, 150)

    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expect.poll(() => scrollTop(page)).toBe(300)

    await page.goForward()
    await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible()
    await expect.poll(() => scrollTop(page)).toBe(150)

    // A push after going back is a new entry, so it starts at the top again.
    await page.goBack()
    await expect.poll(() => scrollTop(page)).toBe(300)
    await page.getByRole('link', { name: 'Campaigns', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Campaigns', level: 1 })).toBeVisible()
    await expect.poll(() => scrollTop(page)).toBe(0)
  })
})
