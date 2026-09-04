#!/usr/bin/env node

import { buildSearchCorePack, validateSearchCorePack } from './build.mjs'

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--generated')) {
    await validateSearchCorePack()
    return
  }
  await buildSearchCorePack({ check: true, write: false })
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
