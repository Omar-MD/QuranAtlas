#!/usr/bin/env node

export * from './knowledge/build.mjs'

import { fileURLToPath } from 'node:url'

import { main } from './knowledge/build.mjs'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
