import Aura from '@primeuix/themes/aura'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  modules: [
    '@primevue/nuxt-module',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
  ],

  // Tailwind v4 is wired through its Vite plugin (not a Nuxt module).
  vite: {
    plugins: [tailwindcss()],
  },

  primevue: {
    options: {
      // Aura preset; token alignment to the design system lands in Phase 1a via definePreset().
      theme: {
        preset: Aura,
        options: {
          // Manual dark mode — never media-query. Toggled by the `.dark` class on <html>.
          darkModeSelector: '.dark',
          // Order so Tailwind utilities can override PrimeVue component styles.
          // Matches the layer order declared in app/assets/css/main.css.
          cssLayer: {
            name: 'primevue',
            order: 'tailwind-base, primevue, tailwind-utilities',
          },
        },
      },
    },
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    langDir: 'locales',
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
      { code: 'zh-TW', language: 'zh-TW', file: 'zh-TW.json', name: '繁體中文' },
    ],
  },
})
