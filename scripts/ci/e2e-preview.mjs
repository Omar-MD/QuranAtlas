#!/usr/bin/env node

import { buildPreviewArtifact, runPreviewPlaywright } from './commands.mjs'

const args = []
let includeOffline = false

for (const arg of process.argv.slice(2)) {
  if (arg === '--') continue
  if (arg === '--include-offline') includeOffline = true
  else args.push(arg)
}

buildPreviewArtifact()
runPreviewPlaywright(args, { includeOffline })
