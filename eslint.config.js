import js from '@eslint/js';
import globals from 'globals';
import unicorn from 'eslint-plugin-unicorn';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // Base recommended rules
  js.configs.recommended,

  // Main source files (browser environment)
  {
    files: ['src/**/*.js'],
    plugins: {
      unicorn,
      'no-unsanitized': noUnsanitized,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      // Security: execution
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Security: forbidden storage APIs
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use IDB (src/core/db.js) instead.' },
        { name: 'sessionStorage', message: 'Use IDB (src/core/db.js) instead.' },
      ],

      // Security: no innerHTML with untrusted data
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',

      // Security: no document.write
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'write', message: 'document.write is forbidden.' },
      ],

      // Unicorn: selective rules that add real value
      'unicorn/no-array-for-each': 'error',
      'unicorn/prefer-query-selector': 'error',
      'unicorn/prefer-dom-node-append': 'error',
      'unicorn/prefer-dom-node-remove': 'error',
      'unicorn/no-document-cookie': 'error',
    },
  },

  // Service Worker (serviceworker globals, no browser window)
  {
    files: ['src/sw.js'],
    plugins: {
      unicorn,
      'no-unsanitized': noUnsanitized,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.serviceworker },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },

  // Node.js scripts and config files
  {
    files: [
      'scripts/**/*.js',
      'vite.config.js',
      'eslint.config.js',
      'vitest.config.js',
      'playwright.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Test files (browser + node globals, relaxed rules)
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Allow unused expressions in test assertions
      'no-unused-expressions': 'off',
    },
  },

  // Disable all rules that conflict with Prettier (must be last)
  eslintConfigPrettier,

  // Ignore generated/external dirs
  {
    ignores: ['dist/', 'coverage/', '.lighthouseci/', 'node_modules/', 'public/dataset/'],
  },
];
