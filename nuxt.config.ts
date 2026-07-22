import tailwindcss from '@tailwindcss/vite'
import { InsightPreset } from './app/theme/insight-preset'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  css: ['primeicons/primeicons.css', '~/assets/css/main.css'],

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

  // Nuxt only auto-imports composables/ one level deep; the conventions put Vue Query
  // composables in composables/queries/, so opt the nested directories in.
  imports: {
    dirs: ['composables/**'],
  },

  primevue: {
    options: {
      // Aura preset; token alignment to the design system lands in Phase 1a via definePreset().
      theme: {
        preset: InsightPreset,
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
    // Needed for i18n to emit valid absolute SEO links; Vercel supplies the real origin.
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    locales: [
      { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
      { code: 'zh-TW', language: 'zh-TW', file: 'zh-TW.json', name: '繁體中文' },
    ],
  },
})
