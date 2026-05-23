#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, normalize, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const IMPORT_RE = /@import\s+url\(['"](.+?)['"]\)/g

function walk(dir, exts) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) out.push(...walk(full, exts))
    else if (exts.some((ext) => full.endsWith(ext))) out.push(full)
  }
  return out
}

function toPosix(path) {
  return path.split('\\').join('/')
}

function normalisePath(path) {
  return toPosix(normalize(path))
}

function resolveImportPath(entryPath, importPath) {
  return posix.normalize(posix.join(posix.dirname(normalisePath(entryPath)), importPath))
}

function isAllowlisted(path, allowlist) {
  return allowlist.some((entry) => entry.path === path && entry.owner && entry.reason)
}

export function listStyleEntryFiles(repoRoot) {
  return walk(resolve(repoRoot, 'src/styles'), ['.css'])
    .map((path) => toPosix(relative(repoRoot, path)))
    .sort()
}

export function analyseStyleEntry({
  entryText,
  files,
  entryPath = 'src/styles/index.css',
  allowlist = [],
  repoRoot = '',
  report = false,
}) {
  const findings = []
  const normalisedFiles = files.map(normalisePath)
  const fileSet = new Set(normalisedFiles)
  const imported = []
  const importCounts = new Map()

  for (const match of entryText.matchAll(IMPORT_RE)) {
    const resolved = normalisePath(resolveImportPath(entryPath, match[1]))
    imported.push({
      index: imported.length + 1,
      importPath: match[1],
      resolved,
    })
    importCounts.set(resolved, (importCounts.get(resolved) ?? 0) + 1)
    if (!fileSet.has(resolved)) {
      findings.push({
        code: 'stale-import',
        path: resolved,
        message: `[style-entry] stale import ${match[1]} resolves to ${resolved}, but no file exists`,
      })
    }
  }

  for (const [path, count] of importCounts.entries()) {
    if (count > 1) {
      findings.push({
        code: 'duplicate-import',
        path,
        message: `[style-entry] duplicate import ${path} appears ${count} times`,
      })
    }
  }

  for (const path of normalisedFiles) {
    if (path === normalisePath(entryPath)) continue
    if (!importCounts.has(path) && !isAllowlisted(path, allowlist)) {
      findings.push({
        code: 'missing-import',
        path,
        message: `[style-entry] ${path} is a shipping CSS file but is not imported by ${entryPath}`,
      })
    }
  }

  const output = imported
    .map(({ index, resolved }) => `${index}\t${resolved}\t${repoRoot ? normalisePath(resolve(repoRoot, resolved)) : resolved}`)
    .join('\n')

  return {
    ok: findings.length === 0,
    findings,
    report: report ? output : '',
  }
}

export async function runCheck(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT
  const files = options.files ?? listStyleEntryFiles(repoRoot)
  const entryPath = options.entryPath ?? 'src/styles/index.css'
  const entryText = options.entryText ?? readFileSync(resolve(repoRoot, entryPath), 'utf8')
  return analyseStyleEntry({
    entryText,
    files,
    entryPath,
    allowlist: options.allowlist ?? [],
    repoRoot,
    report: Boolean(options.report),
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = process.argv.includes('--report')
  const result = await runCheck({ report })
  if (result.report) console.log(result.report)
  if (!result.ok) {
    for (const finding of result.findings) console.error(finding.message)
    process.exit(1)
  }
}
