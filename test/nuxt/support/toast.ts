import { useToast } from '@nuxt/ui/composables/useToast'
import { withNuxtContext } from './context'

/** `useToast()` for a test body. Called bare, outside a component, its `inject()` warns. */
export function useAppToast() {
  return withNuxtContext(() => useToast())
}
