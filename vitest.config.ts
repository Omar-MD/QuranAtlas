import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://127.0.0.1/',
      },
    },
    setupFiles: ['./tests/setup.js'],
    include: [
      'tests/unit/react-*/**/*.test.ts',
      'tests/unit/react-*/**/*.test.tsx',
      'tests/unit/react-*/**/*.test.mjs',
      'tests/unit/scripts/**/*.test.js',
      'tests/unit/scripts/**/*.test.mjs',
      'tests/unit/shared/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@react': new URL('./src', import.meta.url).pathname,
    },
  },
})
