#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function run(script, args = []) {
  const result = spawnSync(process.execPath, [join(__dirname, script), ...args], {
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function parseProfile(argv) {
  const flag = argv.find((arg) => arg.startsWith('--profile='))
  return flag ? flag.slice('--profile='.length) : 'baseline'
}

function main(argv = process.argv.slice(2)) {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv
  const [command = 'build'] = normalizedArgv

  if (command === 'mushaf-pages') {
    const [subcommand = 'build', ...rest] = normalizedArgv.slice(1)
    if (subcommand === 'import') {
      run('mushaf-pages/import.mjs', rest)
      return
    }
    if (subcommand === 'build') {
      run('mushaf-pages/build.mjs', rest)
      return
    }
    console.error(`Unknown mushaf-pages command: ${subcommand}`)
    console.error('Usage: pnpm run data -- mushaf-pages [import|build] [--profile=baseline|full] [--riwayah=qaloon] [--pages=1-604]')
    process.exit(1)
  }

  if (command === 'aliases') {
    run('derive-verse-aliases.mjs')
    return
  }

  if (command === 'check') {
    run('source-catalog.mjs')
    run('text/build.mjs', ['--profile=baseline'])
    run('knowledge/build.mjs', ['--check'])
    run('mushaf-pages/build.mjs', ['--profile=baseline', '--check'])
    run('riwayah-packages/build.mjs', ['--profile=baseline', '--check'])
    return
  }

  if (command === 'build') {
    const profile = parseProfile(normalizedArgv.slice(1))
    run('text/build.mjs', [`--profile=${profile}`])
    if (profile !== 'catalog') {
      run('knowledge/build.mjs')
      run('mushaf-pages/build.mjs', [`--profile=${profile}`])
      run('riwayah-packages/build.mjs', [`--profile=${profile}`])
    }
    return
  }

  console.error(`Unknown data command: ${command}`)
  console.error('Usage: pnpm run data -- [build|check|aliases|mushaf-pages] [--profile=baseline|full|catalog]')
  process.exit(1)
}

main()
