#!/usr/bin/env node

export * from './sources/catalog.mjs'

import { fileURLToPath } from 'node:url'

import { main } from './sources/catalog.mjs'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
