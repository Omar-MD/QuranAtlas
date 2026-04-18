/**
 * Playwright configuration for QuranAtlas E2E tests.
 */

import { defineConfig, devices } from '@playwright/test'

const USE_PREVIEW_SERVER = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const PLAYWRIGHT_PORT = USE_PREVIEW_SERVER ? 4173 : 5173
const PLAYWRIGHT_BASE_URL = `http://localhost:${PLAYWRIGHT_PORT}`
const TABLET_ONLY_GREP = /@tablet/
const OFFLINE_GREP = /@offline/
const webServerCommand = USE_PREVIEW_SERVER
  ? `pnpm run build && pnpm exec vite preview --port ${PLAYWRIGHT_PORT} --strictPort`
  : `pnpm exec vite --port ${PLAYWRIGHT_PORT} --strictPort`

// Preview server for offline tests — runs a production build so the service
// worker is present and can cache the shell.  Kept on a separate port (4174)
// so it can co-exist with the dev server when both project groups run.
const PREVIEW_PORT = 4174
const PREVIEW_BASE_URL = `http://localhost:${PREVIEW_PORT}`

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
      grepInvert: [TABLET_ONLY_GREP, OFFLINE_GREP],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Tablet',
      grep: TABLET_ONLY_GREP,
      grepInvert: OFFLINE_GREP,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'Mobile Chrome',
      grepInvert: [TABLET_ONLY_GREP, OFFLINE_GREP],
      use: { ...devices['Pixel 5'] },
    },
    // -----------------------------------------------------------------------
    // Offline (Preview) — runs @offline tests only.
    //
    // A production build is required because the service worker is only
    // emitted by vite-plugin-pwa during `vite build`.  This project spins up
    // a separate preview server on port 4174 so it can run alongside (or
    // independently of) the normal dev-server projects.
    //
    // Run in isolation:
    //   pnpm exec playwright test --project="Offline (Preview)"
    // In CI the full suite includes it automatically.
    // -----------------------------------------------------------------------
    {
      name: 'Offline (Preview)',
      grep: OFFLINE_GREP,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: PREVIEW_BASE_URL,
      },
    },
  ],
  webServer: [
    // Dev server — used by chromium, Tablet, Mobile Chrome projects
    {
      command: webServerCommand,
      url: PLAYWRIGHT_BASE_URL,
      reuseExistingServer: !process.env.CI && !USE_PREVIEW_SERVER,
    },
    // Preview server — used exclusively by the "Offline (Preview)" project.
    // Always builds fresh to ensure the SW manifest is up-to-date.
    {
      command: `pnpm run build && pnpm exec vite preview --port ${PREVIEW_PORT} --strictPort`,
      url: PREVIEW_BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
