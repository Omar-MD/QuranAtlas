#!/usr/bin/env node

import { changedFiles, detectAffected } from './affected.mjs'
import { ensureReleaseMushafPages, run, runPnpm, runPreviewPlaywright } from './commands.mjs'

const files = changedFiles()
const affected = detectAffected(files)

console.log('Affected validation gates:')
for (const [key, value] of Object.entries(affected)) console.log(`  ${key}=${value}`)

runPnpm(['run', 'check'])
runPnpm(['run', 'test'])

if (affected.build_relevant) {
  const mushafPagesRequired = affected.mushaf_pages_relevant || affected.e2e_relevant
  if (mushafPagesRequired) ensureReleaseMushafPages()
  runPnpm(['run', 'ci:build'], {
    env: {
      QURANATLAS_DATASET_RELEVANT: String(affected.dataset_relevant),
      QURANATLAS_MUSHAF_PAGES_RELEVANT: String(mushafPagesRequired),
      QURANATLAS_MUSHAF_PAGES_PREBUILT: String(mushafPagesRequired),
      VITE_QURANATLAS_DEPLOY_TARGET: 'production',
    },
  })
  run('node', ['scripts/check-chunks.js'])
} else {
  console.log('[validate-affected] build inputs unchanged; skipping app build and chunk check')
}

if (affected.e2e_relevant) {
  runPreviewPlaywright(['--grep-invert', '@offline'])
  runPreviewPlaywright(['--grep', '@offline'], { includeOffline: true })
  runPnpm(['run', 'visual'], {
    env: { PLAYWRIGHT_USE_PREVIEW: '1' },
    unsetEnv: ['FORCE_COLOR'],
  })
} else {
  console.log('[validate-affected] e2e inputs unchanged; skipping Playwright suites')
}

if (affected.storybook_relevant) {
  runPnpm(['run', 'build:storybook'])
  runPnpm(['run', 'test:storybook'])
} else {
  console.log('[validate-affected] Storybook inputs unchanged; skipping Storybook build/tests')
}

runPnpm(['run', 'docs:check'])
