#!/usr/bin/env node

export * from './text/build.mjs'
export { buildManifestPayload } from './manifest/inventory.mjs'

import { fileURLToPath } from 'node:url'

import { main } from './text/build.mjs'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
