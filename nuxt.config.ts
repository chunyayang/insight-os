import { InsightPreset } from './app/theme/insight-preset'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  css: ['primeicons/primeicons.css', '~/assets/css/main.css'],

  modules: [
    '@nuxt/ui',
    '@primevue/nuxt-module',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
  ],

  // @nuxt/ui registers the Tailwind v4 Vite plugin itself — do NOT also add
  // @tailwindcss/vite, or Tailwind runs twice.
  ui: {
    // Our cookie-based useTheme() is the sole owner of dark mode. @nuxtjs/color-mode
    // (which @nuxt/ui would otherwise pull in) defaults to localStorage, which isn't
    // readable during SSR and would reintroduce the light-flash on first paint.
    colorMode: false,
  },

  icon: {
    // Bundle only the icons actually referenced in source, rather than fetching from
    // the Iconify API at runtime.
    clientBundle: {
      scan: {
        // The scanner skips .ts/.js by default ("to improve performance"), but the
        // sidebar's icon names live in constants/navigation.ts, not in a template.
        // Without this they miss the bundle and fall back to a runtime Iconify API
        // request — invisible nav icons wherever that host is slow or blocked.
        // Extends the default glob rather than replacing it, so .vue stays covered.
        globInclude: ['**/*.{vue,jsx,tsx,md,mdc,mdx,yml,yaml}', 'app/**/*.ts'],
      },
    },
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
          // Must match the @layer declaration in app/assets/css/main.css exactly.
          cssLayer: {
            name: 'primevue',
            order: 'theme, base, primevue, components, utilities',
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
