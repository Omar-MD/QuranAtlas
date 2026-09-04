#!/usr/bin/env node

export * from './sources/fetch.mjs'
export { normalizeQuranDbTranslation } from './sources/providers/quran-db-translation.mjs'
export { normalizeQulTranslationRows } from './sources/providers/qul-translation.mjs'
export { normalizeQulTafsirEntries } from './sources/providers/qul-tafsir.mjs'

import { fileURLToPath } from 'node:url'

import { main } from './sources/fetch.mjs'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
