import { describe, expect, it, beforeEach } from 'vitest'
import { useToast } from '@nuxt/ui/composables/useToast'
import { useNotify } from '../../app/composables/useNotify'

/**
 * These tests run at module scope — no component is being set up — which is exactly the
 * condition `plugins/vue-query.ts` calls `useNotify()` under: from a QueryCache /
 * MutationCache `onError` callback, inside `runWithContext`.
 *
 * That distinction is the whole point. `useI18n()` throws "Must be called at the top of
 * a `setup` function" there, which silently killed every global error toast until it was
 * swapped for the `$i18n` Composer off the Nuxt app. A regression here is invisible in
 * the UI — the failure just never gets reported — so it is worth a test.
 */
describe('useNotify outside a component setup', () => {
  beforeEach(() => {
    useToast().clear()
  })

  it('raises a localized error toast without throwing', async () => {
    const { toasts } = useToast()

    useNotify().error('errors.codes.notFound')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({
      title: 'Something went wrong',
      description: "We couldn't find what you were looking for.",
      color: 'error',
    })
  })

  it('translates the success key it is handed', async () => {
    const { toasts } = useToast()

    useNotify().success('common.states.loading')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ title: 'Loading…', color: 'success' })
  })

  it('renders the key itself rather than throwing on an unknown key', async () => {
    const { toasts } = useToast()

    useNotify().error('errors.codes.somethingNobodyDefined')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(toasts.value[0]?.description).toBe('errors.codes.somethingNobodyDefined')
  })
})
