#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const PRIMITIVE_RE = /var\(\s*(--(?:c|s|r|ff|fs|lh|dur|ease)-[a-z0-9-]+)/gi

function walk(dir, exts) {
  const out = []
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) out.push(...walk(full, exts))
    else if (exts.some((ext) => full.endsWith(ext))) out.push(full)
  }
  return out
}

function isAllowlisted(path, allowlist) {
  return allowlist.some((entry) => (
    entry.path === path
    && entry.owner
    && entry.reason
    && entry.removeWhen
  ))
}

export function runPrimitiveTokenConsumptionCheck({
  files,
  allowlist = [],
  advisory = false,
}) {
  const findings = []

  for (const file of files) {
    if (file.path.includes('/tokens/')) continue
    if (isAllowlisted(file.path, allowlist)) continue
    for (const match of file.content.matchAll(PRIMITIVE_RE)) {
      findings.push({
        code: 'primitive-token',
        path: file.path,
        token: match[1],
        message: `[primitive-token-consumption] ${file.path} consumes primitive token ${match[1]}`,
      })
    }
  }

  return {
    ok: advisory ? true : findings.length === 0,
    findings,
  }
}

export async function runCheck(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT
  const files = options.files ?? walk(resolve(repoRoot, 'src/styles'), ['.css']).map((path) => ({
    path: relative(repoRoot, path).split('\\').join('/'),
    content: readFileSync(path, 'utf8'),
  }))
  return runPrimitiveTokenConsumptionCheck({
    files,
    allowlist: options.allowlist ?? [],
    advisory: Boolean(options.advisory),
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const advisory = process.argv.includes('--advisory')
  const result = await runCheck({ advisory })
  for (const finding of result.findings) console.warn(finding.message)
  if (!result.ok) process.exit(1)
}
