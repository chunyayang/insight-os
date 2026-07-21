import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

// E2E smoke boots the Nuxt server for you (import test/expect from
// '@nuxt/test-utils/playwright'). Kept OUT of the blocking CI gate for the MVP.
export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  use: {
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
