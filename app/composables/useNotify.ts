import { getCurrentInstance } from 'vue'
import { useToast } from '@nuxt/ui/composables/useToast'

/**
 * The app's one way to raise a transient message.
 *
 * Exists so nothing outside this file has to know which toast implementation is
 * mounted — notably `plugins/vue-query.ts`, which previously reached through
 * `nuxt.vueApp.config.globalProperties.$toast` to notify from outside a component.
 *
 * Takes i18n KEYS, not strings: callers are usually error handlers holding an
 * `error.code`, and the hard rule is that no user-facing string is hardcoded.
 */
export function useNotify() {
  const { $i18n, vueApp } = useNuxtApp()

  // `useToast()` inject()s the toaster's `max`, which Vue warns about outside setup. The
  // app context makes that inject legal there, but it reads app-level provides only, so
  // inside a component keep the plain call: UToaster provides `max` down the tree.
  const toast = getCurrentInstance() ? useToast() : vueApp.runWithContext(() => useToast())

  // Deliberately NOT useI18n(): vue-i18n's composable throws "Must be called at the top
  // of a `setup` function" when there is no current component instance, and the most
  // important caller — plugins/vue-query.ts's cache-level error handler — is a callback,
  // not a component. `$i18n` is the same global Composer, reachable through the Nuxt
  // app context that runWithContext restores, so it works from either side.
  const t = (key: string, params: Record<string, unknown> = {}) => $i18n.t(key, params)

  function error(messageKey: string, params?: Record<string, unknown>) {
    toast.add({
      title: t('common.states.error'),
      description: t(messageKey, params),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }

  /** A neutral explanation — a role limit or a state, not a failure. */
  function info(messageKey: string) {
    toast.add({
      title: t(messageKey),
      color: 'info',
      icon: 'i-lucide-info',
    })
  }

  function success(messageKey: string) {
    toast.add({
      title: t(messageKey),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }

  return { error, info, success }
}
