<script setup lang="ts">
import { en, zh_tw as zhTw } from '@nuxt/ui/locale'

// Keep <html lang> (and dir) in sync with the active locale. Required for the WCAG AA
// floor — screen readers announce content in the right language — and it lets the font
// stack pick the Traditional Chinese face for zh-TW instead of a mismatched fallback.
// The `.dark` class on <html> is contributed separately by plugins/theme.ts; Unhead
// merges both sets of htmlAttrs.
const localeHead = useLocaleHead()
useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
}))

// Nuxt UI keeps its own locale registry for the strings baked into its components
// (pagination labels, close buttons). Ours is the @nuxtjs/i18n locale, so map across
// rather than letting the two drift.
const { locale } = useI18n()
const uiLocale = computed(() => (locale.value === 'zh-TW' ? zhTw : en))
</script>

<template>
  <!-- UApp provides the toast/overlay portals and Nuxt UI's locale (RTL + built-in
       component strings). Wraps everything so errors surface on every route, login
       included. `<Toast>` below is PrimeVue's and is removed with it. -->
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>

  <Toast position="bottom-right" />
</template>
