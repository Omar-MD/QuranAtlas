import tseslint from 'typescript-eslint'

const scriptFiles = [
  '*.js',
  '*.mjs',
  'scripts/**/*.js',
  'scripts/**/*.mjs',
]

const typedFiles = [
  'src/**/*.{ts,tsx}',
  'shared/**/*.ts',
  'tests/e2e/**/*.ts',
  '.storybook/**/*.{ts,tsx}',
  'playwright.config.js',
  'vite.config.js',
]

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/dataset/**',
      'public/search-packs/**',
      'storybook-static/**',
      'test-output/**',
    ],
  },
  {
    files: scriptFiles,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        AbortController: 'readonly',
        BroadcastChannel: 'readonly',
        Cache: 'readonly',
        CacheStorage: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        Headers: 'readonly',
        Map: 'readonly',
        Promise: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        ResizeObserver: 'readonly',
        Set: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        caches: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        indexedDB: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: typedFiles,
  })),
]
