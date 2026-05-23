#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const HEX_RE = /#[0-9a-f]{3,8}\b/gi
const MOTION_RE = /\b\d+ms\s+(?:ease|ease-in|ease-out|ease-in-out|linear)\b/gi
const RADIUS_RE = /border-radius:\s*\d+(?:\.\d+)?(?:px|rem)\b/gi
const LOCAL_ALLOW_RE = /qa-design-literal-allow\s+(color|motion|radius)\s*:/i

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

function hasLocalAllow(file, category) {
  return new RegExp(`qa-design-literal-allow\\s+${category}\\s*:`, 'i').test(file.content)
}

export function runDesignLiteralCheck({
  files,
  advisory = false,
}) {
  const findings = []

  for (const file of files) {
    if (file.path.includes('/tokens/')) continue

    if (!hasLocalAllow(file, 'color')) {
      for (const match of file.content.matchAll(HEX_RE)) {
        findings.push({
          code: 'hardcoded-color',
          path: file.path,
          value: match[0],
          message: `[design-literals] ${file.path} uses hardcoded color ${match[0]}`,
        })
      }
    }

    if (!hasLocalAllow(file, 'motion')) {
      for (const match of file.content.matchAll(MOTION_RE)) {
        findings.push({
          code: 'raw-motion',
          path: file.path,
          value: match[0],
          message: `[design-literals] ${file.path} uses raw motion literal ${match[0]}`,
        })
      }
    }

    if (!hasLocalAllow(file, 'radius')) {
      for (const match of file.content.matchAll(RADIUS_RE)) {
        findings.push({
          code: 'raw-radius',
          path: file.path,
          value: match[0],
          message: `[design-literals] ${file.path} uses raw radius literal ${match[0]}`,
        })
      }
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
  return runDesignLiteralCheck({
    files,
    advisory: Boolean(options.advisory),
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const advisory = process.argv.includes('--advisory')
  const result = await runCheck({ advisory })
  for (const finding of result.findings) console.warn(finding.message)
  if (!result.ok) process.exit(1)
}
