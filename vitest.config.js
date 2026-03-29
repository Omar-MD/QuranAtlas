import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.js'],
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: [
        'src/sw.js', // Service Worker — needs SW test environment (E2E)
        'src/core/app.js', // Browser init entry point (SW reg, storage.persist) — E2E tested
        'src/reader/index.js', // Phase 0 placeholder
        'src/review/index.js', // Phase 0 placeholder
      ],
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
      },
    },
  },
});
