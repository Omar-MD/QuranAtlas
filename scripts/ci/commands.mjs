import { spawnSync } from 'node:child_process'

export function envFlag(name, fallback = false) {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  return /^(1|true|yes)$/i.test(value)
}

export function run(command, args, options = {}) {
  const env = { ...process.env, ...options.env }
  for (const name of options.unsetEnv ?? []) delete env[name]
  const result = spawnSync(command, args, {
    env,
    shell: process.platform === 'win32',
    stdio: options.stdio ?? 'inherit',
  })
  if (!options.allowFailure && result.status !== 0) process.exit(result.status ?? 1)
  return result
}

export function runPnpm(args, options = {}) {
  return run('pnpm', args, options)
}

export function ensureReleaseMushafPages() {
  const check = runPnpm([
    'run',
    'data',
    '--',
    'mushaf-pages',
    'build',
    '--profile=baseline',
    '--check',
    '--require-riwayah=qaloon',
  ], {
    allowFailure: true,
    stdio: 'pipe',
  })

  if (check.status === 0) {
    console.log('[mushaf-pages] normalized Qaloon page artifacts present')
  } else {
    console.log('[mushaf-pages] normalized Qaloon pages missing or stale; importing release page set')
    runPnpm([
      'run',
      'data',
      '--',
      'mushaf-pages',
      'import',
      '--riwayah=qaloon',
      '--pages=1-604',
    ])
  }

  runPnpm([
    'run',
    'data',
    '--',
    'mushaf-pages',
    'build',
    '--profile=baseline',
    '--require-riwayah=qaloon',
  ])
}

export function buildPreviewArtifact() {
  if (envFlag('PLAYWRIGHT_SKIP_BUILD')) {
    console.log('[preview-build] PLAYWRIGHT_SKIP_BUILD=1; reusing existing dist/')
    return
  }

  ensureReleaseMushafPages()
  runPnpm(['run', 'ci:build'], {
    env: {
      QURANATLAS_DATASET_RELEVANT: 'true',
      QURANATLAS_MUSHAF_PAGES_RELEVANT: 'true',
      QURANATLAS_MUSHAF_PAGES_PREBUILT: 'true',
      VITE_QURANATLAS_DEPLOY_TARGET: 'production',
    },
  })
  run('node', ['scripts/check-chunks.js'])
}

export function runPreviewPlaywright(args, { includeOffline = false } = {}) {
  runPnpm(['exec', 'playwright', 'test', ...args], {
    env: {
      ...(includeOffline ? { PLAYWRIGHT_INCLUDE_OFFLINE: '1' } : {}),
      PLAYWRIGHT_USE_PREVIEW: '1',
    },
    unsetEnv: ['FORCE_COLOR', 'NO_COLOR'],
  })
}
