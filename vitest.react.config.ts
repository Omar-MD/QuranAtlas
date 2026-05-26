import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/react-*/**/*.test.ts', 'tests/unit/react-*/**/*.test.tsx', 'tests/unit/react-*/**/*.test.mjs', 'src-react/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@react': new URL('./src-react', import.meta.url).pathname,
    },
  },
})
