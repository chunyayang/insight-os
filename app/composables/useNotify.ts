// Imported explicitly rather than relying on auto-import: PrimeVue also exports a
// `useToast`, and during the migration its version wins the auto-import race (Nuxt
// warns about the duplicate at build time). The explicit path stays correct once
// PrimeVue is gone, so this import needs no follow-up.
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
  const toast = useToast()

  // Deliberately NOT useI18n(): vue-i18n's composable throws "Must be called at the top
  // of a `setup` function" when there is no current component instance, and the most
  // important caller — plugins/vue-query.ts's cache-level error handler — is a callback,
  // not a component. `$i18n` is the same global Composer, reachable through the Nuxt
  // app context that runWithContext restores, so it works from either side.
  const { $i18n } = useNuxtApp()
  const t = (key: string) => $i18n.t(key)

  function error(messageKey: string) {
    toast.add({
      title: t('common.states.error'),
      description: t(messageKey),
      color: 'error',
      icon: 'i-lucide-circle-alert',
    })
  }

  function success(messageKey: string) {
    toast.add({
      title: t(messageKey),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }

  return { error, success }
}
