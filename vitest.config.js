import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    globals: true,
    include: ['tests/unit/**/*.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.opencode/**', '.cache/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['stories/**', 'tests/e2e/**', '.opencode/**', '.cache/**', 'dist/**'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 75
      }
    }
  }
})
