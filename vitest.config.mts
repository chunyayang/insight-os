import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

// The Nuxt `~`/`@` alias points at the app/ source dir. Plain-Node unit tests don't go
// through Nuxt's resolver, so mirror it here for files that import '~/constants/...'.
const appDir = fileURLToPath(new URL('./app', import.meta.url))

// `.mts` so importing @nuxt/test-utils works without forcing "type":"module" on the
// whole project (that would change how every other .js/.mjs config is parsed).
export default defineConfig({
  test: {
    // No tests exist yet in the scaffold; feature slices add them. See testing-and-ci.
    passWithNoTests: true,
    projects: [
      {
        // Pure logic — fast, runs in Node. Formatters, permission map, mappers.
        resolve: {
          alias: { '~': appDir, '@': appDir },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        // Needs the Nuxt runtime: components, composables, auto-imports, plugins.
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})
