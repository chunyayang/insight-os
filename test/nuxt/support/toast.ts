import { useToast } from '@nuxt/ui/composables/useToast'

/**
 * `useToast()` for a test body. Called bare, outside any component, it makes Vue warn
 * about `inject()`; the app context is what `useNotify()` resolves it under too.
 */
export function useAppToast() {
  return useNuxtApp().vueApp.runWithContext(() => useToast())
}
