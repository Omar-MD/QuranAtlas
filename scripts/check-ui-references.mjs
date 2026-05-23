#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const REQUIRED_FIELDS = [
  'Component',
  'State and viewport',
  'Accepted visual traits',
  'Forbidden traits',
  'Token expectations',
  'Responsive differences',
  'Non-goals',
]

const DEFAULT_ALLOWLIST = [
  {
    path: 'docs/ui-references/README.md',
    owner: 'ui-references',
    reason: 'Directory index.',
    category: 'index-note',
  },
]

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function isAllowlisted(path, allowlist) {
  return allowlist.some((entry) => (
    entry.path === path
    && entry.owner
    && entry.reason
    && entry.category
  ))
}

export function checkUiReferences({ files, allowlist = [] } = {}) {
  const mergedAllowlist = [...DEFAULT_ALLOWLIST, ...allowlist]
  const findings = []
  const pngs = new Set()
  const notes = new Map()

  for (const file of files) {
    if (file.path.endsWith('.DS_Store')) {
      findings.push({
        code: 'system-file',
        path: file.path,
        message: `[ui-references] remove stray system file ${file.path}`,
      })
      continue
    }

    if (file.path.endsWith('.png')) {
      pngs.add(file.path.replace(/\.png$/, ''))
      continue
    }

    if (file.path.endsWith('.md')) {
      if (isAllowlisted(file.path, mergedAllowlist)) continue
      notes.set(file.path.replace(/\.md$/, ''), file)
    }
  }

  for (const base of pngs) {
    if (!notes.has(base)) {
      findings.push({
        code: 'orphan-image',
        path: `${base}.png`,
        message: `[ui-references] ${base}.png is missing ${base}.md`,
      })
    }
  }

  for (const [base, file] of notes.entries()) {
    if (!pngs.has(base)) {
      findings.push({
        code: 'orphan-note',
        path: `${base}.md`,
        message: `[ui-references] ${base}.md is missing ${base}.png`,
      })
      continue
    }

    for (const field of REQUIRED_FIELDS) {
      if (!file.content?.includes(field)) {
        findings.push({
          code: 'missing-field',
          path: file.path,
          field,
          message: `[ui-references] ${file.path} is missing required field label "${field}"`,
        })
      }
    }
  }

  return {
    ok: findings.length === 0,
    findings,
  }
}

export async function runCheck(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT
  const allowlist = [...DEFAULT_ALLOWLIST, ...(options.allowlist ?? [])]
  const files = options.files ?? walk(resolve(repoRoot, 'docs/ui-references')).map((path) => {
    const rel = relative(repoRoot, path).split('\\').join('/')
    const isText = rel.endsWith('.md')
    return {
      path: rel,
      content: isText ? readFileSync(path, 'utf8') : null,
    }
  })
  return checkUiReferences({ files, allowlist })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCheck()
  if (!result.ok) {
    for (const finding of result.findings) console.error(finding.message)
    process.exit(1)
  }
}
