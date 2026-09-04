import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 5173
const PREVIEW_PORT = 4173
const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const baseURL = `http://127.0.0.1:${usePreview ? PREVIEW_PORT : APP_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/core-smoke.spec.ts', '**/offline-lifecycle.spec.ts'],
  outputDir: './test-output/playwright',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  // A hung suite must fail with evidence, not sit silent until the CI job
  // timeout kills it without a trace.
  // Bounded but generous: a 2-vCPU runner runs the suites ~50x slower than
  // a workstation (service-worker compile + dataset sync dominate).
  globalTimeout: process.env.CI ? 600_000 : 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'off',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'desktop-smoke',
      testMatch: '**/core-smoke.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'mobile-smoke',
      testMatch: '**/core-smoke.spec.ts',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'offline-lifecycle',
      testMatch: '**/offline-lifecycle.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  // Single-process command chain: pnpm exec vite (no mise layer). mise
  // spawns tasks in their own process group, so Playwright's teardown
  // group-kill cannot reach vite through `mise run` and the webServer
  // survives, hanging the job after the tests finish.
  webServer: {
    command: usePreview ? 'pnpm exec vite preview --strictPort' : 'pnpm exec vite',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
