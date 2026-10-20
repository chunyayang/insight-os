import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useAppToast } from './support/toast'
import { useNotify } from '../../app/composables/useNotify'

/**
 * These tests run at module scope — no component is being set up — which is exactly the
 * condition `plugins/vue-query.ts` calls `useNotify()` under: from the MutationCache's
 * `onError` callback, inside `runWithContext`.
 *
 * That distinction is the whole point. `useI18n()` throws "Must be called at the top of
 * a `setup` function" there, which silently killed every global error toast until it was
 * swapped for the `$i18n` Composer off the Nuxt app. A regression here is invisible in
 * the UI — the failure just never gets reported — so it is worth a test.
 */
describe('useNotify outside a component setup', () => {
  beforeEach(() => {
    useAppToast().clear()
  })

  it('raises a localized error toast without throwing', async () => {
    const { toasts } = useAppToast()

    useNotify().error('errors.codes.notFound')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({
      title: 'Something went wrong',
      description: "We couldn't find what you were looking for.",
      color: 'error',
    })
  })

  it('interpolates the params it is handed into the message', async () => {
    const { toasts } = useAppToast()

    useNotify().error('common.table.pageFailed', { page: '3' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toasts.value[0]?.description).toBe(
      "Couldn't load page 3. The page you were on is still shown.",
    )
  })

  it('translates the success key it is handed', async () => {
    const { toasts } = useAppToast()

    useNotify().success('common.states.loading')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ title: 'Loading…', color: 'success' })
  })

  it('renders the key itself rather than throwing on an unknown key', async () => {
    const { toasts } = useAppToast()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useNotify().error('errors.codes.somethingNobodyDefined')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('somethingNobodyDefined'))
    warn.mockRestore()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toasts.value[0]?.description).toBe('errors.codes.somethingNobodyDefined')
  })
})
