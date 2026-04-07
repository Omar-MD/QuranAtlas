import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**', '.opencode/**', '.cache/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['stories/**', 'tests/e2e/**', '.opencode/**', '.cache/**'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 75
      }
    }
  }
})
