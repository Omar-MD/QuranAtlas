#!/usr/bin/env node

import { rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Success-only freshness stamp for `data -- build`: removed at build start,
// written after the last lane. A failed partial build leaves no stamp, so the
// next run rebuilds instead of trusting partial outputs.
const BUILD_STAMP = join(__dirname, '..', '..', '.data-build-complete')

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
      .flatMap((arg) =>
        arg
          .slice('--skip='.length)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
  )
}

async function main(argv = process.argv.slice(2)) {
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
    if (subcommand === 'fetch-release') {
      run('mushaf-pages/fetch-release.mjs', rest)
      return
    }
    if (subcommand === 'restore-release') {
      const archive = rest.find((arg) => arg.startsWith('--archive='))?.slice('--archive='.length)
      const check = rest.length === 1 && rest[0] === '--check'
      if (!check && (!archive || !isAbsolute(archive) || rest.length !== 1)) {
        console.error(
          'Usage: pnpm run data -- mushaf-pages restore-release (--archive=/absolute/path/to/archive.tar | --check)',
        )
        process.exit(1)
      }
      run('mushaf-pages/release-archive.mjs', check ? ['--check'] : [`--archive=${archive}`])
      return
    }
    console.error(
      'Usage: pnpm run data -- mushaf-pages build [--profile=baseline|private] | mushaf-pages import --edition=qalun-furatiyyah-2023-v1 --pdf="/absolute/path/to/pinned.pdf" | mushaf-pages fetch-release [--edition=qalun-quran-ws-v1] | mushaf-pages restore-release (--archive=/absolute/path/to/archive.tar | --check)',
    )
    process.exit(1)
  }

  if (command === 'aliases') {
    run('derive-verse-aliases.mjs')
    return
  }

  if (command === 'search-tanzil-import') {
    run('search/tanzil/import.mjs')
    return
  }

  if (command === 'check') {
    const args = normalizedArgv.slice(1)
    const profile = parseProfile(args)
    if (profile !== 'baseline' && profile !== 'private') {
      console.error(
        'Top-level data check supports only --profile=baseline or --profile=private (private checks the Mushaf tree both editions ship into)',
      )
      process.exit(1)
    }
    const sharedProfile = datasetProfile(profile)
    // Source-catalog validation is single-point here: text/build.mjs loads and
    // validates the catalog (this lane's first step), so a bad catalog still
    // fails `check` with the catalog's error list.
    run('text/build.mjs', [`--profile=${sharedProfile}`])
    run('check-juz-hizb.mjs')
    run('check-search-packs.mjs')
    run('knowledge/build.mjs', ['--check'])
    run('mushaf-pages/build.mjs', [`--profile=${profile}`, '--check'])
    run('riwayah-packages/build.mjs', [`--profile=${profile}`, '--check'])
    return
  }

  if (command === 'build') {
    const args = normalizedArgv.slice(1)
    const profile = parseProfile(args)
    const sharedProfile = datasetProfile(profile)
    const skipped = skipSet(args)
    await rm(BUILD_STAMP, { force: true })
    run('text/build.mjs', [`--profile=${sharedProfile}`])
    run('search/build.mjs', [`--profile=${sharedProfile}`])
    run('knowledge/build.mjs')
    if (!skipped.has('mushaf-pages')) run('mushaf-pages/build.mjs', [`--profile=${profile}`])
    run('riwayah-packages/build.mjs', [`--profile=${profile}`])
    await writeFile(BUILD_STAMP, `${new Date().toISOString()}\n`, 'utf8')
    return
  }

  console.error(
    'Usage: pnpm run data -- build [--profile=baseline|private] | check [--profile=baseline|private] | aliases | search-tanzil-import | mushaf-pages',
  )
  process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
