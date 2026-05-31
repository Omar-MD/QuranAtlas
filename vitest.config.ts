import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const reactTestInclude = [
  'tests/unit/react-*/**/*.test.ts',
  'tests/unit/react-*/**/*.test.tsx',
  'tests/unit/react-*/**/*.test.mjs',
  'src/**/*.test.tsx',
]

const nodeTestInclude = [
  'tests/unit/scripts/**/*.test.js',
  'tests/unit/scripts/**/*.test.mjs',
  'tests/unit/shared/**/*.test.ts',
]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: nodeTestInclude,
        },
      },
      {
        extends: true,
        test: {
          name: 'react',
          environment: 'jsdom',
          environmentOptions: {
            jsdom: {
              url: 'http://127.0.0.1/',
            },
          },
          setupFiles: ['./tests/setup.js'],
          include: reactTestInclude,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@react': new URL('./src', import.meta.url).pathname,
    },
  },
})
