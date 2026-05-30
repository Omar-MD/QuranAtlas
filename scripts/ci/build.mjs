#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

function envFlag(name, fallback = false) {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  return /^(1|true|yes)$/i.test(value)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...options.env },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const datasetRelevant = envFlag('QURANATLAS_DATASET_RELEVANT')
const mushafPagesRelevant = envFlag('QURANATLAS_MUSHAF_PAGES_RELEVANT')
const mushafPagesPrebuilt = envFlag('QURANATLAS_MUSHAF_PAGES_PREBUILT')

if (datasetRelevant) {
  const dataArgs = ['run', 'data', '--', 'build']
  if (!mushafPagesRelevant || mushafPagesPrebuilt) dataArgs.push('--skip=mushaf-pages')
  const mushafNote = mushafPagesPrebuilt
    ? ' (Mushaf pages already generated)'
    : mushafPagesRelevant
      ? ''
      : ' (skipping Mushaf pages)'
  console.log(`[ci-build] dataset build enabled${mushafNote}`)
  run('pnpm', dataArgs)
} else {
  console.log('[ci-build] dataset inputs unchanged; reusing committed public/dataset assets')
}

run('pnpm', ['exec', 'vite', 'build'])
