import { defineConfig, devices } from '@playwright/test'

const REACT_PORT = 5174
const REACT_PREVIEW_PORT = 4175
const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const REACT_BASE_URL = `http://127.0.0.1:${usePreview ? REACT_PREVIEW_PORT : REACT_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'react-shell/**/*.spec.ts',
    'read/react-golden.spec.ts',
    'configure/react-golden.spec.ts',
    'navigate/react-golden.spec.ts',
    'onboard/react-golden.spec.ts',
    'infra/react-offline.spec.ts',
  ],
  outputDir: './test-output/react-traces',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { outputFolder: './test-output/react-report' }]],
  use: {
    baseURL: REACT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: 'react-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: usePreview ? 'env -u NO_COLOR pnpm run preview:react' : 'env -u NO_COLOR pnpm run dev:react',
    url: REACT_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
