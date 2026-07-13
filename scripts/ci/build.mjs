#!/usr/bin/env node

import { envFlag, runPnpm } from './commands.mjs'
import { copyPublicAssetEntries, releaseRuntimeAssetEntries } from './public-assets.mjs'

const datasetRelevant = envFlag('QURANATLAS_DATASET_RELEVANT')
const mushafPagesRelevant = envFlag('QURANATLAS_MUSHAF_PAGES_RELEVANT')
const mushafPagesPrebuilt = envFlag('QURANATLAS_MUSHAF_PAGES_PREBUILT')
const datasetProfile = process.env.QURANATLAS_DATASET_PROFILE || 'baseline'

if (datasetRelevant) {
  const dataArgs = ['run', 'data', '--', 'build', `--profile=${datasetProfile}`]
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

await copyPublicAssetEntries({
  entries: releaseRuntimeAssetEntries,
  logPrefix: 'ci-build',
})
