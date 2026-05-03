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

  if (command === 'aliases') {
    run('derive-verse-aliases.mjs')
    return
  }

  if (command === 'check') {
    run('source-catalog.mjs')
    run('build-dataset.mjs', ['--profile=baseline'])
    run('build-knowledge-dataset.mjs', ['--check'])
    return
  }

  if (command === 'build') {
    const profile = parseProfile(normalizedArgv.slice(1))
    run('build-dataset.mjs', [`--profile=${profile}`])
    if (profile !== 'catalog') {
      run('build-knowledge-dataset.mjs')
    }
    return
  }

  console.error(`Unknown data command: ${command}`)
  console.error('Usage: pnpm run data -- [build|check|aliases] [--profile=baseline|full|catalog]')
  process.exit(1)
}

main()
