/**
 * Playwright configuration for QuranAtlas E2E tests.
 */

import { defineConfig, devices } from '@playwright/test'

const USE_PREVIEW_SERVER = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const PLAYWRIGHT_PORT = USE_PREVIEW_SERVER ? 4173 : 5173
const PLAYWRIGHT_BASE_URL = `http://localhost:${PLAYWRIGHT_PORT}`
const OFFLINE_GREP = /@offline/
// Desktop-variant tests force viewport to 1440×900 via test.use({ viewport }),
// so running them on Mobile Chrome just repeats the same 1440 layout.  Chromium
// runs them; Mobile Chrome skips them.
const DESKTOP_GREP = /@desktop/

// The Offline project requires a production build (for the service worker),
// which takes ~30–60s.  By default we skip it for local runs unless opted in:
//   - CI: always included
//   - Local: set PLAYWRIGHT_INCLUDE_OFFLINE=1, or pass --project="Offline (Preview)"
const INCLUDE_OFFLINE =
  !!process.env.CI ||
  process.env.PLAYWRIGHT_INCLUDE_OFFLINE === '1' ||
  /Offline/.test(process.argv.join(' '))

const webServerCommand = USE_PREVIEW_SERVER
  ? `pnpm run build && pnpm exec vite preview --port ${PLAYWRIGHT_PORT} --strictPort`
  : `pnpm exec vite --port ${PLAYWRIGHT_PORT} --strictPort`

const PREVIEW_PORT = 4174
const PREVIEW_BASE_URL = `http://localhost:${PREVIEW_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-output/traces',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 6 : undefined,
  reporter: [['html', { outputFolder: './test-output/report' }]],
  use: {
    baseURL: PLAYWRIGHT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Default timeout for individual locator actions / expect assertions.
    // Playwright's own default is 0 (no cap), which means a broken selector
    // waits the full test-level 30s.  5s fail-fast keeps the suite snappy
    // without masking real slowness; tests that need longer still pass an
    // explicit { timeout } to override.
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: 'chromium',
      grepInvert: OFFLINE_GREP,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      grepInvert: [OFFLINE_GREP, DESKTOP_GREP],
      use: { ...devices['Pixel 5'] },
    },
    ...(INCLUDE_OFFLINE
      ? [{
        name: 'Offline (Preview)',
        grep: OFFLINE_GREP,
        use: {
          ...devices['Desktop Chrome'],
          baseURL: PREVIEW_BASE_URL,
        },
      }]
      : []),
  ],
  webServer: [
    // Dev server — used by chromium and Mobile Chrome projects
    {
      command: webServerCommand,
      url: PLAYWRIGHT_BASE_URL,
      reuseExistingServer: !process.env.CI && !USE_PREVIEW_SERVER,
    },
    // Preview server — used by the "Offline (Preview)" project.  Gated so
    // local runs don't pay the ~30–60s build cost unless offline tests are
    // actually requested.
    ...(INCLUDE_OFFLINE
      ? [{
        command: `pnpm run build && pnpm exec vite preview --port ${PREVIEW_PORT} --strictPort`,
        url: PREVIEW_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }]
      : []),
  ],
})
