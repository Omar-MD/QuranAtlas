#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

import { changedFiles, detectAffected } from './affected.mjs'

function run(command, args, options = {}) {
  const env = { ...process.env, ...options.env }
  for (const name of options.unsetEnv ?? []) delete env[name]
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const files = changedFiles()
const affected = detectAffected(files)

console.log('Affected validation gates:')
for (const [key, value] of Object.entries(affected)) console.log(`  ${key}=${value}`)

run('pnpm', ['run', 'check'])
run('pnpm', ['run', 'test'])

if (affected.build_relevant) {
  run('pnpm', ['run', 'ci:build'], {
    env: {
      QURANATLAS_DATASET_RELEVANT: String(affected.dataset_relevant),
      QURANATLAS_MUSHAF_PAGES_RELEVANT: String(affected.mushaf_pages_relevant),
    },
  })
  run('node', ['scripts/check-chunks.js'])
} else {
  console.log('[validate-affected] build inputs unchanged; skipping app build and chunk check')
}

if (affected.e2e_relevant) {
  run('pnpm', ['exec', 'playwright', 'test', '--grep-invert', '@offline'], {
    env: { PLAYWRIGHT_USE_PREVIEW: '1' },
    unsetEnv: ['FORCE_COLOR', 'NO_COLOR'],
  })
  run('pnpm', ['exec', 'playwright', 'test', '--grep', '@offline'], {
    env: {
      PLAYWRIGHT_INCLUDE_OFFLINE: '1',
      PLAYWRIGHT_USE_PREVIEW: '1',
    },
    unsetEnv: ['FORCE_COLOR', 'NO_COLOR'],
  })
  run('pnpm', ['run', 'visual'], {
    env: { PLAYWRIGHT_USE_PREVIEW: '1' },
    unsetEnv: ['FORCE_COLOR'],
  })
} else {
  console.log('[validate-affected] e2e inputs unchanged; skipping Playwright suites')
}

if (affected.storybook_relevant) {
  run('pnpm', ['run', 'build:storybook'])
  run('pnpm', ['run', 'test:storybook'])
} else {
  console.log('[validate-affected] Storybook inputs unchanged; skipping Storybook build/tests')
}

run('pnpm', ['run', 'docs:check'])
