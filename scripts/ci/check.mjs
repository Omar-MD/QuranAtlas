#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { join } from 'node:path'

const ESLINT_TARGETS = [
  'src/',
  'shared/',
  'tests/e2e/**/*.ts',
  'tests/unit/react-*/**/*.{ts,tsx,mjs}',
  'tests/unit/scripts/**/*.{js,mjs}',
  'tests/unit/shared/**/*.ts',
  '.storybook/**/*.{ts,tsx}',
  'playwright.config.js',
  'playwright.visual.config.js',
  'vite.config.js',
  'vitest.config.ts',
  'vitest.storybook.config.ts',
]

const TASKS = [
  {
    name: 'typecheck',
    command: join('node_modules', '.bin', 'tsc'),
    args: ['--project', 'tsconfig.json', '--noEmit'],
  },
  {
    name: 'lint',
    command: join('node_modules', '.bin', 'eslint'),
    args: ESLINT_TARGETS,
  },
  { name: 'react-boundaries', command: 'node', args: ['scripts/check-react-boundaries.mjs'] },
  { name: 'react-design-literals', command: 'node', args: ['scripts/check-react-design-literals.mjs'] },
  { name: 'react-radix-boundaries', command: 'node', args: ['scripts/check-react-radix-boundaries.mjs'] },
  { name: 'react-component-registry', command: 'node', args: ['scripts/check-react-component-registry.mjs'] },
  { name: 'react-ui-forbidden-patterns', command: 'node', args: ['scripts/check-react-ui-forbidden-patterns.mjs'] },
  { name: 'react-mushaf-assets', command: 'node', args: ['scripts/check-react-mushaf-assets.mjs'] },
  { name: 'react-mushaf-indexes', command: 'node', args: ['scripts/check-react-mushaf-indexes.mjs'] },
  { name: 'feature-state', command: 'node', args: ['scripts/check-no-feature-state.js'] },
  { name: 'ui-references', command: 'node', args: ['scripts/check-ui-references.mjs'] },
]

function runTask(task) {
  return new Promise((resolve) => {
    const startedAt = performance.now()
    const child = spawn(task.command, task.args, {
      env: process.env,
      shell: process.platform === 'win32',
    })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('close', (status) => {
      resolve({
        ...task,
        output,
        seconds: (performance.now() - startedAt) / 1000,
        status,
      })
    })
  })
}

function printResult(result) {
  const status = result.status === 0 ? 'ok' : `failed (${result.status})`
  console.log(`[check] ${result.name}: ${status} ${result.seconds.toFixed(1)}s`)
  if (result.output.trim()) {
    console.log(result.output.trimEnd())
  }
}

const results = await Promise.all(TASKS.map(runTask))
for (const result of results) printResult(result)

const failed = results.filter((result) => result.status !== 0)
if (failed.length > 0) {
  console.error(`[check] ${failed.length} gate(s) failed: ${failed.map((result) => result.name).join(', ')}`)
  process.exit(1)
}

console.log(`[check] ${results.length} gates passed`)
