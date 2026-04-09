/**
 * Playwright configuration for QuranAtlas E2E tests.
 */

import { defineConfig, devices } from '@playwright/test'

const USE_PREVIEW_SERVER = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const PLAYWRIGHT_PORT = USE_PREVIEW_SERVER ? 4173 : 5173
const PLAYWRIGHT_BASE_URL = `http://localhost:${PLAYWRIGHT_PORT}`
const TABLET_ONLY_GREP = /@tablet/
const webServerCommand = USE_PREVIEW_SERVER
  ? `pnpm run build && pnpm exec vite preview --port ${PLAYWRIGHT_PORT} --strictPort`
  : `pnpm exec vite --port ${PLAYWRIGHT_PORT} --strictPort`

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-output/traces',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: './test-output/report' }]],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      grepInvert: TABLET_ONLY_GREP,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Tablet',
      grep: TABLET_ONLY_GREP,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'Mobile Chrome',
      grepInvert: TABLET_ONLY_GREP,
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: PLAYWRIGHT_BASE_URL,
    reuseExistingServer: !process.env.CI && !USE_PREVIEW_SERVER,
  },
})
