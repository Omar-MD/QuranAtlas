#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_ALLOWLIST = [
  {
    pattern: '^qa-pages-$',
    owner: 'infra',
    category: 'cache-key-prefix',
    reason: 'Offline cache names reuse the qa- prefix but are not CSS classes.',
    removeWhen: 'Selector liveness stops scanning cache-key strings as class references.',
  },
  {
    pattern: '^qa-mushaf-controls--below-page$',
    owner: 'read',
    category: 'dynamic-class',
    reason: 'Placement modifier is toggled at runtime.',
    removeWhen: 'Mushaf controls consolidate to explicit mode classes.',
  },
  {
    pattern: '^qa-mushaf-controls--inside-safe-bottom$',
    owner: 'read',
    category: 'dynamic-class',
    reason: 'Placement modifier is toggled at runtime.',
    removeWhen: 'Mushaf controls consolidate to explicit mode classes.',
  },
  {
    pattern: '^qa-(settings-title|settings-reading|settings-sources|storage-hdr|about-version-sha|offline-banner)$',
    owner: 'configure',
    category: 'dom-id',
    reason: 'These qa-* strings are DOM ids, not CSS classes.',
    removeWhen: 'Selector liveness distinguishes ids from class references.',
  },
  {
    pattern: '^qa-(assets-can-go-back|input-confirm)$',
    owner: 'configure',
    category: 'non-style-hook',
    reason: 'These qa-* strings are storage or test hooks, not visual selectors.',
    removeWhen: 'Selector liveness distinguishes non-style qa-* hooks from class references.',
  },
  {
    pattern: '^qa-sc-kbd--gesture$',
    owner: 'navigate',
    category: 'dynamic-class',
    reason: 'Shortcuts sheet gesture tokens are concatenated in imperative DOM assembly.',
    removeWhen: 'Selector liveness parses concatenated className expressions.',
  },
  {
    pattern: '^qa-settings$',
    owner: 'configure',
    category: 'selector-query',
    reason: 'This qa-* string is used as a DOM query anchor, not as a class definition.',
    removeWhen: 'Selector liveness distinguishes query-selector strings from class references.',
  },
  {
    pattern: '^qa-(search-v1|fonts-v1)$',
    owner: 'infra',
    category: 'cache-key',
    reason: 'Service-worker cache names reuse the qa- prefix but are not CSS classes.',
    removeWhen: 'Selector liveness stops scanning cache-key strings as class references.',
  },
]

const CLASS_RE = /\.((?:qa-[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?))/gi
const STATIC_CLASS_RE = /class\s*=\s*["'`]{1}([^"'`]+)["'`]{1}/g
const CLASSNAME_RE = /className\s*=\s*["'`]([^"'`]+)["'`]/g
const CLASSLIST_RE = /classList\.(?:add|remove|toggle)\(([^)]+)\)/g
const DIRECTIVE_RE = /class:((?:qa-[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?))/gi
const STRING_CLASS_RE = /['"`]((?:qa-[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?))['"`]/gi
const DYNAMIC_CLASS_RE = /qa-[a-z0-9-]*\$\{/gi
const TOKEN_RE = /qa-[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?/gi

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

function addTokenMatches(set, content, regex, mapper = (match) => match[1]) {
  for (const match of content.matchAll(regex)) {
    set.add(mapper(match))
  }
}

function addClassTokens(set, raw) {
  for (const token of raw.match(TOKEN_RE) ?? []) {
    set.add(token)
  }
}

function hasAllowlistMatch(value, allowlist) {
  return allowlist.some((entry) => (
    entry.pattern
    && entry.owner
    && entry.category
    && entry.reason
    && entry.removeWhen
    && new RegExp(entry.pattern).test(value)
  ))
}

function extractCssClasses(cssFiles) {
  const classes = new Map()
  for (const file of cssFiles) {
    for (const match of file.content.matchAll(CLASS_RE)) {
      const className = match[1]
      if (!classes.has(className)) classes.set(className, new Set())
      classes.get(className).add(file.path)
    }
  }
  return classes
}

function extractCodeReferences(codeFiles) {
  const references = new Set()
  const uncertain = new Set()

  for (const file of codeFiles) {
    addTokenMatches(references, file.content, DIRECTIVE_RE)
    addTokenMatches(references, file.content, STRING_CLASS_RE)
    for (const match of file.content.matchAll(STATIC_CLASS_RE)) {
      addClassTokens(references, match[1])
    }
    for (const match of file.content.matchAll(CLASSNAME_RE)) {
      addClassTokens(references, match[1])
    }
    for (const match of file.content.matchAll(CLASSLIST_RE)) {
      addClassTokens(references, match[1])
    }
    for (const match of file.content.matchAll(DYNAMIC_CLASS_RE)) {
      uncertain.add(match[0].replace(/\$\{$/, ''))
    }
  }

  return { references, uncertain }
}

export function runSelectorLivenessCheck({
  cssFiles,
  codeFiles,
  allowlist = DEFAULT_ALLOWLIST,
  advisory = false,
}) {
  const cssClasses = extractCssClasses(cssFiles)
  const { references, uncertain: dynamicReferences } = extractCodeReferences(codeFiles)
  const findings = []
  const uncertain = []

  for (const [className, paths] of cssClasses.entries()) {
    if (!references.has(className) && !hasAllowlistMatch(className, allowlist)) {
      findings.push({
        code: 'css-only-class',
        className,
        paths: [...paths],
        message: `[selector-liveness] ${className} is defined in CSS but not referenced in code (${[...paths].join(', ')})`,
      })
    }
  }

  for (const className of references) {
    if (!cssClasses.has(className) && !hasAllowlistMatch(className, allowlist)) {
      findings.push({
        code: 'code-only-class',
        className,
        message: `[selector-liveness] ${className} is referenced in code but has no CSS definition`,
      })
    }
  }

  for (const classPrefix of dynamicReferences) {
    if (!hasAllowlistMatch(classPrefix, allowlist)) {
      uncertain.push({
        code: 'dynamic-reference',
        classPrefix,
        message: `[selector-liveness] dynamic class prefix ${classPrefix} needs an allowlist entry or explicit mapping`,
      })
    }
  }

  return {
    ok: advisory ? true : findings.length === 0 && uncertain.length === 0,
    findings,
    uncertain,
  }
}

export async function runCheck(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT
  const cssFiles = options.cssFiles ?? walk(resolve(repoRoot, 'src/styles'), ['.css']).map((path) => ({
    path: relative(repoRoot, path).split('\\').join('/'),
    content: readFileSync(path, 'utf8'),
  }))
  const codeFiles = options.codeFiles ?? walk(resolve(repoRoot, 'src'), ['.svelte', '.ts', '.js']).map((path) => ({
    path: relative(repoRoot, path).split('\\').join('/'),
    content: readFileSync(path, 'utf8'),
  }))
  return runSelectorLivenessCheck({
    cssFiles,
    codeFiles,
    allowlist: options.allowlist ?? DEFAULT_ALLOWLIST,
    advisory: Boolean(options.advisory),
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const advisory = process.argv.includes('--advisory')
  const result = await runCheck({ advisory })
  for (const finding of result.findings) console.warn(finding.message)
  for (const finding of result.uncertain) console.warn(finding.message)
  if (!result.ok) process.exit(1)
}
