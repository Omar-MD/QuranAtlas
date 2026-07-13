#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { dirname, isAbsolute, join } from 'node:path'
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

function datasetProfile(profile) {
  return profile === 'private' ? 'baseline' : profile
}

function skipSet(argv) {
  return new Set(
    argv
      .filter((arg) => arg.startsWith('--skip='))
      .flatMap((arg) => arg.slice('--skip='.length).split(',').map((item) => item.trim()).filter(Boolean)),
  )
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
    if (subcommand === 'restore-release') {
      const archive = rest.find((arg) => arg.startsWith('--archive='))?.slice('--archive='.length)
      const check = rest.length === 1 && rest[0] === '--check'
      if (!check && (!archive || !isAbsolute(archive) || rest.length !== 1)) {
        console.error('Usage: pnpm run data -- mushaf-pages restore-release (--archive=/absolute/path/to/archive.tar | --check)')
        process.exit(1)
      }
      run('mushaf-pages/release-archive.mjs', check ? ['--check'] : [`--archive=${archive}`])
      return
    }
    console.error(`Unknown mushaf-pages command: ${subcommand}`)
    console.error('Usage: pnpm run data -- mushaf-pages build [--profile=baseline|full|private] [--require-riwayah=qaloon] [--require-edition=qalun-furatiyyah-2023-v1] | mushaf-pages import --edition=qalun-furatiyyah-2023-v1 --pdf="/absolute/path/to/pinned.pdf" | mushaf-pages restore-release (--archive=/absolute/path/to/archive.tar | --check)')
    process.exit(1)
  }

  if (command === 'aliases') {
    run('derive-verse-aliases.mjs')
    return
  }

  if (command === 'check') {
    const args = normalizedArgv.slice(1)
    const profile = parseProfile(args)
    if (profile !== 'baseline') {
      console.error('Top-level data check supports only --profile=baseline; use mushaf-pages build --profile=private --check for a read-only private Mushaf check')
      process.exit(1)
    }
    run('source-catalog.mjs')
    run('text/build.mjs', ['--profile=baseline'])
    run('search/build.mjs', ['--profile=baseline', '--check'])
    run('knowledge/build.mjs', ['--check'])
    run('mushaf-pages/build.mjs', ['--profile=baseline', '--check'])
    run('riwayah-packages/build.mjs', ['--profile=baseline', '--check'])
    return
  }

  if (command === 'build') {
    const args = normalizedArgv.slice(1)
    const profile = parseProfile(args)
    const sharedProfile = datasetProfile(profile)
    const skipped = skipSet(args)
    run('text/build.mjs', [`--profile=${sharedProfile}`])
    if (profile !== 'catalog') {
      run('search/build.mjs', [`--profile=${sharedProfile}`])
      run('knowledge/build.mjs')
      run('riwayah-packages/build.mjs', [`--profile=${profile}`])
      if (!skipped.has('mushaf-pages')) run('mushaf-pages/build.mjs', [`--profile=${profile}`])
    }
    return
  }

  console.error(`Unknown data command: ${command}`)
  console.error('Usage: pnpm run data -- build [--profile=baseline|full|private|catalog] | check [--profile=baseline] | aliases | mushaf-pages')
  process.exit(1)
}

main()
