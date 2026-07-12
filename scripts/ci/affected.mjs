#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const META_ONLY_PATTERNS = [
  /^docs\//,
  /^tests\/unit\//,
  /^scripts\/docs\//,
  /^\.docs-derive-manifest\.json$/,
  /\.md$/,
  /^LICENSE$/,
  /^\.gitignore$/,
  /^\.editorconfig$/,
  /^\.github\/.*\.md$/,
]

const AUTOMATION_PATTERNS = [
  /^\.github\/actions\//,
  /^\.github\/workflows\//,
  /^scripts\/ci\//,
  /^scripts\/check-(?:chunks|no-feature-state|react-|ui-references)/,
]

const DATASET_PATTERNS = [
  /^data\/catalog\//,
  /^data\/normalized\//,
  /^data\/taxonomy\//,
  /^scripts\/data\//,
  /^shared\/search\//,
  /^shared\/reader-assets\//,
  /^public\/dataset\//,
  /^public\/search-packs\//,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
]

const MUSHAF_PAGE_PATTERNS = [
  /^data\/catalog\/mushaf-(?:assets|pages)\.json$/,
  /^data\/catalog\/mushaf-editions\//,
  /^data\/normalized\/mushaf-pages\//,
  /^data\/normalized\/quran\/riwayat\//,
  /^public\/dataset\/indexes\/mushaf-assets\.json$/,
  /^public\/dataset\/mushaf-pages\//,
  /^scripts\/data\/(?:cli|mushaf-pages\/.+)\.mjs$/,
  /^shared\/reader-assets\/default-profile\.json$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
]

const BUILD_PATTERNS = [
  /^index\.html$/,
  /^public\//,
  /^src\//,
  /^shared\//,
  /^data\//,
  /^scripts\/data\//,
  ...AUTOMATION_PATTERNS,
  /^\.storybook\//,
  /^vite\.config\.js$/,
  /^playwright(?:\.visual)?\.config\.js$/,
  /^vitest(?:\.storybook)?\.config\.ts$/,
  /^tsconfig\.json$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
]

const STORYBOOK_PATTERNS = [
  /^\.storybook\//,
  /^src\/components\//,
  /^src\/design-system\//,
  /^src\/app\//,
  /^shared\//,
  ...AUTOMATION_PATTERNS,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
]

function parseArgs(argv) {
  const parsed = {
    base: null,
    githubOutput: process.env.GITHUB_OUTPUT || null,
    head: null,
    json: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--json') parsed.json = true
    else if (arg === '--base') parsed.base = argv[++index] ?? null
    else if (arg.startsWith('--base=')) parsed.base = arg.slice('--base='.length)
    else if (arg === '--head') parsed.head = argv[++index] ?? null
    else if (arg.startsWith('--head=')) parsed.head = arg.slice('--head='.length)
    else if (arg === '--github-output') parsed.githubOutput = argv[++index] ?? null
    else if (arg.startsWith('--github-output=')) parsed.githubOutput = arg.slice('--github-output='.length)
    else throw new Error(`Unknown affected option: ${arg}`)
  }
  return parsed
}

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' })
  if (result.status !== 0 && !allowFailure) {
    const detail = result.stderr.trim() || result.stdout.trim()
    throw new Error(`git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
  return result.stdout.trim()
}

function uniqueLines(value) {
  return [...new Set(String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].sort()
}

function defaultBase() {
  const originDev = git(['rev-parse', '--verify', 'origin/dev'], { allowFailure: true })
  if (originDev) {
    const mergeBase = git(['merge-base', 'HEAD', 'origin/dev'], { allowFailure: true })
    if (mergeBase) return mergeBase
  }
  const previous = git(['rev-parse', '--verify', 'HEAD~1'], { allowFailure: true })
  return previous || 'HEAD'
}

export function changedFiles({ base = null, head = null } = {}) {
  if (base && head) {
    return uniqueLines(git(['diff', '--name-only', base, head], { allowFailure: true }))
  }

  const localBase = base || defaultBase()
  const committed = git(['diff', '--name-only', localBase, head || 'HEAD'], { allowFailure: true })
  const unstaged = git(['diff', '--name-only'], { allowFailure: true })
  const staged = git(['diff', '--name-only', '--cached'], { allowFailure: true })
  const untracked = git(['ls-files', '--others', '--exclude-standard'], { allowFailure: true })
  return uniqueLines([committed, unstaged, staged, untracked].join('\n'))
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => pattern.test(file))
}

function everyFileMatches(files, patterns) {
  return files.length > 0 && files.every((file) => matchesAny(file, patterns))
}

export function detectAffected(files, { noBaseline = false } = {}) {
  if (noBaseline) {
    return {
      app_build_required: true,
      build_relevant: true,
      dataset_relevant: true,
      e2e_relevant: true,
      full_dataset_relevant: true,
      mushaf_pages_relevant: true,
      reason: 'no-baseline',
      storybook_relevant: true,
    }
  }

  if (files.length === 0) {
    return {
      app_build_required: false,
      build_relevant: false,
      dataset_relevant: false,
      e2e_relevant: false,
      full_dataset_relevant: false,
      mushaf_pages_relevant: false,
      reason: 'no-files-changed',
      storybook_relevant: false,
    }
  }

  const automationRelevant = files.some((file) => matchesAny(file, AUTOMATION_PATTERNS))
  const e2eRelevant = automationRelevant || !everyFileMatches(files, META_ONLY_PATTERNS)
  const datasetRelevant = files.some((file) => matchesAny(file, DATASET_PATTERNS))
  const mushafPagesRelevant = files.some((file) => matchesAny(file, MUSHAF_PAGE_PATTERNS))
  const buildRelevant = e2eRelevant || files.some((file) => matchesAny(file, BUILD_PATTERNS))
  const storybookRelevant = automationRelevant || files.some((file) => matchesAny(file, STORYBOOK_PATTERNS))
  const firstRelevant = files.find((file) => !matchesAny(file, META_ONLY_PATTERNS))
  const metaReason = datasetRelevant || buildRelevant ? 'non-ui-infra-only' : 'docs-or-unit-only'

  return {
    app_build_required: buildRelevant,
    build_relevant: buildRelevant,
    dataset_relevant: datasetRelevant,
    e2e_relevant: e2eRelevant,
    full_dataset_relevant: datasetRelevant,
    mushaf_pages_relevant: mushafPagesRelevant,
    reason: firstRelevant ? `changed:${firstRelevant}` : metaReason,
    storybook_relevant: storybookRelevant,
  }
}

function writeGithubOutput(path, values) {
  if (!path) return
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value)}`)
  appendFileSync(path, `${lines.join('\n')}\n`, 'utf8')
}

function printSummary(files, result) {
  if (files.length === 0) {
    console.log('Changed files: none')
  } else {
    console.log('Changed files:')
    for (const file of files) console.log(`  ${file}`)
  }
  console.log('Affected gates:')
  for (const [key, value] of Object.entries(result)) console.log(`  ${key}=${value}`)
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv)
  const noBaseline = options.base === '' || options.base === '0000000000000000000000000000000000000000'
  const files = noBaseline ? [] : changedFiles({ base: options.base, head: options.head })
  const result = detectAffected(files, { noBaseline })
  if (options.json) {
    console.log(JSON.stringify({ files, ...result }, null, 2))
  } else {
    printSummary(files, result)
  }
  writeGithubOutput(options.githubOutput || env.GITHUB_OUTPUT, result)
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
