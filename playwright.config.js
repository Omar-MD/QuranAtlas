/**
 * Playwright configuration for QuranAtlas E2E tests.
 */

import { defineConfig, devices } from '@playwright/test'

const USE_PREVIEW_SERVER = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
// PLAYWRIGHT_SKIP_BUILD=1 skips `pnpm run build` and assumes `dist/` already
// exists. CI uses this with `dist/` downloaded from the upstream Build job,
// avoiding a redundant rebuild in the E2E job.
const SKIP_BUILD = process.env.PLAYWRIGHT_SKIP_BUILD === '1'
const PLAYWRIGHT_PORT = USE_PREVIEW_SERVER ? 4173 : 5173
const PLAYWRIGHT_BASE_URL = `http://localhost:${PLAYWRIGHT_PORT}`
const OFFLINE_GREP = /@offline/
// Desktop-variant tests force viewport to 1440×900 via test.use({ viewport }),
// so running them on Mobile Chrome just repeats the same 1440 layout.  Chromium
// runs them; Mobile Chrome skips them.
const DESKTOP_GREP = /@desktop/
// `@chromium-only` opts a test out of the Mobile Chrome project.  Use for tests
// with no viewport branch, no mobile-specific selectors, and no touch-gesture
// dependency — pure IDB / settings / keyboard / cross-tab / command-sheet flows.
// Mobile Chrome still covers anything that branches on viewport, drives drawer
// or MarginHeader, or simulates a touch gesture.  See CLAUDE.md Rule 7.4.
const CHROMIUM_ONLY_GREP = /@chromium-only/

// The Offline project requires a production build (for the service worker),
// which takes ~30–60s.  By default we skip it for local runs unless opted in:
//   - CI: always included
//   - Local: set PLAYWRIGHT_INCLUDE_OFFLINE=1, or pass --project="Offline (Preview)"
const INCLUDE_OFFLINE =
  !!process.env.CI ||
  process.env.PLAYWRIGHT_INCLUDE_OFFLINE === '1' ||
  /Offline/.test(process.argv.join(' '))

const previewCmd = SKIP_BUILD
  ? `pnpm exec vite preview --port ${PLAYWRIGHT_PORT} --strictPort`
  : `pnpm run build && pnpm exec vite preview --port ${PLAYWRIGHT_PORT} --strictPort`
const webServerCommand = USE_PREVIEW_SERVER
  ? previewCmd
  : `pnpm exec vite --port ${PLAYWRIGHT_PORT} --strictPort`

// When the main webServer is already a preview build, the @offline project
// can target it directly — no need for a second server on PREVIEW_PORT.
// Local-only path (USE_PREVIEW_SERVER=0) still spins up a dedicated preview
// server for offline tests because the dev server can't exercise the SW.
const PREVIEW_PORT = 4174
const OFFLINE_BASE_URL = USE_PREVIEW_SERVER
  ? PLAYWRIGHT_BASE_URL
  : `http://localhost:${PREVIEW_PORT}`

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
      testIgnore: /visual\//,
      grepInvert: OFFLINE_GREP,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      testIgnore: /visual\//,
      grepInvert: [OFFLINE_GREP, DESKTOP_GREP, CHROMIUM_ONLY_GREP],
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...(INCLUDE_OFFLINE
      ? [{
        name: 'Offline (Preview)',
        grep: OFFLINE_GREP,
        use: {
          ...devices['Desktop Chrome'],
          baseURL: OFFLINE_BASE_URL,
        },
      }]
      : []),
  ],
  webServer: [
    // Primary server — chromium + Mobile Chrome (and offline when
    // USE_PREVIEW_SERVER=1, since the offline project then shares this
    // single preview build instead of spawning a second one).
    {
      command: webServerCommand,
      url: PLAYWRIGHT_BASE_URL,
      reuseExistingServer: !process.env.CI && !USE_PREVIEW_SERVER,
      timeout: USE_PREVIEW_SERVER ? 120_000 : 60_000,
    },
    // Dedicated preview server for the "Offline (Preview)" project — only
    // needed when the primary server is the dev server (no SW). With
    // USE_PREVIEW_SERVER=1 the primary server is already a preview build
    // and the offline project reuses it.
    ...(INCLUDE_OFFLINE && !USE_PREVIEW_SERVER
      ? [{
        command: `pnpm run build && pnpm exec vite preview --port ${PREVIEW_PORT} --strictPort`,
        url: OFFLINE_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }]
      : []),
  ],
})
