import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'
import { BYPASS_STATE } from './test/e2e/support/vercel-bypass'

// E2E smoke. Kept OUT of the blocking CI gate for the MVP.
//
// Locally it builds and boots the Nuxt server for you (import test/expect from
// '@nuxt/test-utils/playwright'). With E2E_BASE_URL set it runs against that deployment
// instead — the Vercel preview, from .github/workflows/e2e-preview.yml.
const baseUrl = process.env.E2E_BASE_URL

export default defineConfig<ConfigOptions>({
  testDir: './test/e2e',
  globalSetup: baseUrl ? './test/e2e/support/vercel-bypass.ts' : undefined,
  use: {
    nuxt: baseUrl ? { host: baseUrl } : { rootDir: fileURLToPath(new URL('.', import.meta.url)) },
    // Deployment Protection's bypass cookie, minted once in globalSetup, rather than the
    // secret as an extra header on every request, third-party ones included.
    storageState: baseUrl ? BYPASS_STATE : undefined,
    // A remote run has no local server to poke at, so keep what a failure left behind.
    trace: 'retain-on-failure',
  },
  // WebKit too: Blink and WebKit differ on paint, touch and Intl output (testing-and-ci).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 14 Plus'] } },
  ],
})
