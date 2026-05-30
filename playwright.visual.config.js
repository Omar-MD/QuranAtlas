import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 5173
const PREVIEW_PORT = 4173
const usePreview = process.env.PLAYWRIGHT_USE_PREVIEW === '1'
const baseURL = `http://127.0.0.1:${usePreview ? PREVIEW_PORT : APP_PORT}`

export default defineConfig({
  testDir: './tests/e2e/react-visual',
  snapshotDir: './tests/e2e/react-visual/__screenshots__',
  outputDir: './test-output/visual',
  reporter: [['html', { outputFolder: './test-output/visual-report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'visual-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'visual-tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'visual-mobile', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: usePreview ? 'env -u NO_COLOR pnpm run preview' : 'env -u NO_COLOR pnpm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
