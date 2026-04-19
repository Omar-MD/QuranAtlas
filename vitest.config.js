import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  plugins: [svelte()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    globals: true,
    include: ['tests/unit/**/*.test.js', 'tests/unit/**/*.test.ts'],
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
