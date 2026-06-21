import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 5173
const PREVIEW_PORT = 4173
const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const baseURL = `http://127.0.0.1:${usePreview ? PREVIEW_PORT : APP_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'react-shell/**/*.spec.ts',
    'read/react-golden.spec.ts',
    'read/mushaf-responsive.spec.ts',
    'configure/react-golden.spec.ts',
    'navigate/react-golden.spec.ts',
    'onboard/react-golden.spec.ts',
    'infra/react-offline.spec.ts',
    'search/*.spec.ts',
  ],
  outputDir: './test-output/traces',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { outputFolder: './test-output/report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: usePreview ? 'env -u NO_COLOR pnpm run preview' : 'env -u NO_COLOR pnpm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
