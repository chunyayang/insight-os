import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

// The Nuxt `~`/`@` alias points at the app/ source dir. Plain-Node unit tests don't go
// through Nuxt's resolver, so mirror it here for files that import '~/constants/...'.
const appDir = fileURLToPath(new URL('./app', import.meta.url))

export default defineConfig({
  test: {
    // No tests exist yet in the scaffold; feature slices add them. See testing-and-ci.
    passWithNoTests: true,
    // Vue's one-line notice that <Suspense> is experimental, printed by every
    // mountSuspended() file; nothing in it is ours to act on.
    onConsoleLog: (log) => !log.includes('<Suspense> is an experimental feature'),
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
          setupFiles: ['test/nuxt/support/setup.ts'],
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})
