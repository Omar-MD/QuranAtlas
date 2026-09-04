#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

import { copyPublicAssetEntries, releaseRuntimeAssetEntries } from './public-assets.mjs'

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('pnpm', ['exec', 'vite', 'build'])

await copyPublicAssetEntries({
  entries: releaseRuntimeAssetEntries,
  logPrefix: 'release-build',
})
