import { defineConfig, devices } from '@playwright/test'

const REACT_PORT = 5174
const REACT_BASE_URL = `http://127.0.0.1:${REACT_PORT}`

export default defineConfig({
  testDir: './tests/e2e/react-visual',
  snapshotDir: './tests/e2e/react-visual/__screenshots__',
  outputDir: './test-output/react-visual',
  reporter: [['html', { outputFolder: './test-output/react-visual-report' }]],
  use: {
    baseURL: REACT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'visual-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'visual-mobile', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: 'env -u NO_COLOR pnpm run dev:react',
    url: REACT_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
