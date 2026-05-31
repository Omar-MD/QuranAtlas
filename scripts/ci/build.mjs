#!/usr/bin/env node

import { envFlag, runPnpm } from './commands.mjs'

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
  runPnpm(dataArgs)
} else {
  console.log('[ci-build] dataset inputs unchanged; reusing committed public/dataset assets')
}

runPnpm(['exec', 'vite', 'build'])
