import tseslint from 'typescript-eslint'
import sveltePlugin from 'eslint-plugin-svelte'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/sw.js', 'src/sw-handlers.js', 'src/offline/**']
  },
  // JS files (existing rules)
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        browser: true,
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Promise: 'readonly',
        Request: 'readonly',
        caches: 'readonly',
        CacheStorage: 'readonly',
        Cache: 'readonly',
        crypto: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        BroadcastChannel: 'readonly',
        beforeinstallprompt: 'readonly',
        performance: 'readonly',
        __APP_VERSION__: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
    }
  },
  // TS files (plain .ts only — .svelte.ts files are handled by the Svelte plugin below)
  ...tseslint.configs.recommended.map(c => ({ ...c, files: ['src/**/*.ts'] })),
  // Svelte files (.svelte and .svelte.ts — uses svelte-eslint-parser with TS embedded)
  ...sveltePlugin.configs['flat/recommended'],
  {
    files: ['src/**/*.svelte', 'src/**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    // Include @typescript-eslint rules so disable-comments are valid in <script lang="ts"> blocks
    plugins: tseslint.configs.recommended.reduce((acc, c) => ({ ...acc, ...c.plugins }), {}),
    rules: tseslint.configs.recommended.reduce((acc, c) => ({ ...acc, ...c.rules }), {}),
  },
  // Logger exception
  {
    files: ['src/core/logger.js'],
    rules: { 'no-console': 'off' }
  }
]
