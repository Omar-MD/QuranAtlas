import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type ImportKind = 'static' | 'dynamic'

type ImportRecord = {
  importer: string
  specifier: string
  kind: ImportKind
  resolved: string | null
}

type Allowance = Pick<ImportRecord, 'importer' | 'specifier' | 'kind'>

const PROJECT_ROOT = process.cwd()
const SOURCE_FILE_RE = /\.(?:[cm]?[jt]s|svelte)$/
const STATIC_IMPORT_RE = /\b(?:import|export)\s+(?:type\s+)?(?:[^'"`()]*?\s+from\s*)?['"]([^'"`]+)['"]/g
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"`]+)['"]\s*\)/g

const ACTIVE_ROOTS = [
  'src/App.svelte',
  'src/app-bootstrap.ts',
  'src/read',
  'src/navigate',
  'src/continuity',
  'src/configure',
  'src/onboard',
  'src/data',
  'src/infra',
  'src/core',
]

const REMOVED_SCOPE_PREFIXES = [
  'src/listen',
  'src/mark',
  'src/review',
]

const REMOVED_SUPPORT_FILES = [
  'src/data/tag-layers.ts',
  'src/core/seeds.ts',
  'src/core/tag-colors.ts',
  'src/core/ui.svelte',
  'src/core/ui-bridge.ts',
]

const RUNTIME_DOMAIN_ROOTS = [
  'src/continuity',
  'src/data',
  'src/infra',
  'src/core',
]

const USER_SURFACE_PREFIXES = [
  'src/configure',
  'src/read',
  'src/navigate',
  'src/onboard',
]

const BUILD_ONLY_PREFIXES = [
  'data/catalog',
  'data/normalized',
  'data/taxonomy',
  'scripts',
]

const PROJECT_INTERNAL_PREFIXES = [
  'src/',
  '/src/',
  'data/',
  '/data/',
  'scripts/',
  '/scripts/',
]

const RUNTIME_QURAN_WS_PATTERNS = [
  {
    label: 'static import',
    regex: /\b(?:import|export)\s+(?:type\s+)?(?:[^'"`()]*?\s+from\s*)?['"](?:https?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]/g,
  },
  {
    label: 'dynamic import',
    regex: /\bimport\s*\(\s*['"](?:https?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]\s*\)/g,
  },
  {
    label: 'fetch',
    regex: /\bfetch\s*\(\s*(?:new\s+URL\s*\(\s*)?['"](?:https?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]/g,
  },
  {
    label: 'Request',
    regex: /\bnew\s+Request\s*\(\s*['"](?:https?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]/g,
  },
  {
    label: 'XMLHttpRequest.open',
    regex: /\bopen\s*\(\s*['"][A-Z]+['"]\s*,\s*['"](?:https?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]/g,
  },
  {
    label: 'sendBeacon',
    regex: /\bsendBeacon\s*\(\s*['"](?:https?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]/g,
  },
  {
    label: 'WebSocket',
    regex: /\bnew\s+WebSocket\s*\(\s*['"](?:wss?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]/g,
  },
  {
    label: 'EventSource',
    regex: /\bnew\s+EventSource\s*\(\s*['"](?:https?:)?\/\/[^'"`]*quran\.ws[^'"`]*['"]/g,
  },
]

const REMOVED_SCOPE_ALLOWANCES: Allowance[] = []

const DOMAIN_DIRECTION_ALLOWANCES: Allowance[] = []

function toPosixPath(value: string): string {
  return value.split(path.sep).join(path.posix.sep)
}

function isDirectory(relPath: string): boolean {
  return fs.statSync(path.join(PROJECT_ROOT, relPath)).isDirectory()
}

function listSourceFiles(root: string): string[] {
  if (!isDirectory(root)) return [root]

  const files: string[] = []
  const visit = (current: string) => {
    const absolute = path.join(PROJECT_ROOT, current)
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const child = path.posix.join(current, entry.name)
      if (entry.isDirectory()) {
        visit(child)
        continue
      }
      if (SOURCE_FILE_RE.test(entry.name)) files.push(child)
    }
  }

  visit(root)
  return files
}

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relPath), 'utf8')
}

function isTypeOnlyStaticImport(statement: string): boolean {
  if (/^\s*(?:import|export)\s+type\b/.test(statement)) {
    return true
  }

  const clause = statement.match(/^\s*(?:import|export)\s+([\s\S]+?)\s+from\s+['"]/m)?.[1]?.trim()
  if (!clause?.startsWith('{') || !clause.endsWith('}')) {
    return false
  }

  const specifiers = clause
    .slice(1, -1)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  return specifiers.length > 0 && specifiers.every((part) => /^type\b/.test(part))
}

function extractImports(importer: string): ImportRecord[] {
  const source = readFile(importer)
  const imports: ImportRecord[] = []

  for (const match of source.matchAll(STATIC_IMPORT_RE)) {
    const specifier = match[1]
    if (!specifier || isTypeOnlyStaticImport(match[0])) continue
    imports.push({
      importer,
      specifier,
      kind: 'static',
      resolved: resolveSpecifier(importer, specifier),
    })
  }

  for (const match of source.matchAll(DYNAMIC_IMPORT_RE)) {
    const specifier = match[1]
    if (!specifier) continue
    imports.push({
      importer,
      specifier,
      kind: 'dynamic',
      resolved: resolveSpecifier(importer, specifier),
    })
  }

  return imports
}

function resolveSpecifier(importer: string, specifier: string): string | null {
  if (specifier.startsWith('.')) {
    const importerDir = path.posix.dirname(importer)
    const resolved = path.posix.normalize(path.posix.join(importerDir, specifier))
    return toPosixPath(path.relative(PROJECT_ROOT, path.join(PROJECT_ROOT, resolved)))
  }
  if (!PROJECT_INTERNAL_PREFIXES.some((prefix) => specifier.startsWith(prefix))) return null
  return path.posix.normalize(specifier.replace(/^\/+/, ''))
}

function matchesPrefix(value: string | null, prefixes: string[]): boolean {
  return value !== null && prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}/`))
}

function allowanceKey(record: Allowance): string {
  return `${record.importer} -> ${record.specifier} (${record.kind})`
}

function formatRecord(record: Allowance): string {
  return `${record.importer} -> ${record.specifier} (${record.kind})`
}

function assertOnlyAllowedPairs(message: string, observed: ImportRecord[], allowances: Allowance[]): void {
  const observedKeys = new Set(observed.map(allowanceKey))
  const allowedKeys = new Set(allowances.map(allowanceKey))

  const unexpected = [...new Set(observed
    .filter((entry) => !allowedKeys.has(allowanceKey(entry)))
    .map(formatRecord))]
    .sort()
  const stale = allowances
    .filter((entry) => !observedKeys.has(allowanceKey(entry)))
    .map(formatRecord)
    .sort()

  expect(
    { unexpected, stale },
    `${message}\nUnexpected imports must either be removed or added as exact temporary allowances.\nStale allowances should be deleted as cleanup lands.`,
  ).toEqual({ unexpected: [], stale: [] })
}

function findQuranWsRuntimeViolations(source: string, file: string): string[] {
  const directViolations = RUNTIME_QURAN_WS_PATTERNS.flatMap(({ label, regex }) => {
    const matches = source.match(regex) ?? []
    return matches.map((match) => `${file} -> ${label}: ${match.trim()}`)
  })

  const quranWsSymbols = findQuranWsSymbols(source)
  const computedViolations = [
    ...findRuntimeApiViolations(source, file, 'dynamic import', /\bimport\s*\(/g, 0, quranWsSymbols),
    ...findRuntimeApiViolations(source, file, 'fetch', /\bfetch\s*\(/g, 0, quranWsSymbols),
    ...findRuntimeApiViolations(source, file, 'Request', /\bnew\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*Request\s*\(/g, 0, quranWsSymbols),
    ...findRuntimeApiViolations(source, file, 'sendBeacon', /\bsendBeacon\s*\(/g, 0, quranWsSymbols),
    ...findRuntimeApiViolations(source, file, 'WebSocket', /\bnew\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*WebSocket\s*\(/g, 0, quranWsSymbols),
    ...findRuntimeApiViolations(source, file, 'EventSource', /\bnew\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*EventSource\s*\(/g, 0, quranWsSymbols),
    ...findRuntimeApiViolations(source, file, 'XMLHttpRequest.open', /\bopen\s*\(/g, 1, quranWsSymbols),
  ]

  return [...new Set([...directViolations, ...computedViolations])].sort()
}

function findQuranWsSymbols(source: string): Set<string> {
  const tracked = new Set<string>()
  const declarationRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/g
  const functionRe = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g
  const methodRe = /(?:^|[{\s;,])(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{([\s\S]*?)\}/gm

  let changed = true
  while (changed) {
    changed = false
    declarationRe.lastIndex = 0
    for (const match of source.matchAll(declarationRe)) {
      const name = match[1]
      const expression = extractAssignedExpression(source, (match.index ?? 0) + match[0].length)
      if (!name || tracked.has(name)) continue
      if (expressionContainsQuranWs(expression, tracked)) {
        tracked.add(name)
        changed = true
      }
    }

    methodRe.lastIndex = 0
    for (const match of source.matchAll(methodRe)) {
      const name = match[1]
      const body = match[2]?.trim() ?? ''
      if (!name || tracked.has(name)) continue
      if (expressionContainsQuranWs(body, tracked)) {
        tracked.add(name)
        changed = true
      }
    }

    functionRe.lastIndex = 0
    for (const match of source.matchAll(functionRe)) {
      const name = match[1]
      const body = match[2]?.trim() ?? ''
      if (!name || tracked.has(name)) continue
      if (expressionContainsQuranWs(body, tracked)) {
        tracked.add(name)
        changed = true
      }
    }

    for (const { name, body } of extractClassBodies(source)) {
      if (tracked.has(name)) continue
      if (expressionContainsQuranWs(body, tracked)) {
        tracked.add(name)
        changed = true
      }
    }
  }

  return tracked
}

function expressionContainsQuranWs(expression: string, tracked: Set<string>): boolean {
  if (/(?:https?:)?\/\/[^'"`]*quran\.ws/i.test(expression)) return true

  const identifiers = expression.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []
  return identifiers.some((identifier) => tracked.has(identifier))
}

function extractAssignedExpression(source: string, startIndex: number): string {
  let depth = 0
  let expression = ''
  let stringQuote: '"' | "'" | '`' | null = null
  let escapeNext = false

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index]!

    if (escapeNext) {
      expression += char
      escapeNext = false
      continue
    }

    if (stringQuote) {
      expression += char
      if (char === '\\') {
        escapeNext = true
        continue
      }
      if (char === stringQuote) stringQuote = null
      continue
    }

    if (char === '"' || char === '\'' || char === '`') {
      stringQuote = char
      expression += char
      continue
    }

    if (char === '(' || char === '[' || char === '{') {
      depth += 1
      expression += char
      continue
    }

    if (char === ')' || char === ']' || char === '}') {
      if (depth > 0) depth -= 1
      expression += char
      continue
    }

    if (char === ';' && depth === 0) break

    if (char === '\n' && depth === 0 && isStatementBoundary(source, index + 1)) break

    expression += char
  }

  return expression.trim()
}

function isStatementBoundary(source: string, index: number): boolean {
  let cursor = index
  while (cursor < source.length && (source[cursor] === ' ' || source[cursor] === '\t')) cursor += 1

  if (cursor >= source.length) return true
  if (source[cursor] === '\n' || source[cursor] === '\r') return true

  const remainder = source.slice(cursor)
  return /^(?:const|let|var|function|class|void|return|if|for|while|switch|try|catch|finally|export|import)\b/.test(remainder)
    || remainder.startsWith('}')
}

function extractClassBodies(source: string): Array<{ name: string, body: string }> {
  const classes: Array<{ name: string, body: string }> = []
  const classStartRe = /\bclass\s+([A-Za-z_$][\w$]*)\b/g

  for (const match of source.matchAll(classStartRe)) {
    const name = match[1]
    const startIndex = match.index
    if (!name || typeof startIndex !== 'number') continue

    const bodyStart = source.indexOf('{', startIndex + match[0].length)
    if (bodyStart === -1) continue

    const body = extractBraceBlock(source, bodyStart)
    if (body === null) continue
    classes.push({ name, body })
  }

  return classes
}

function extractBraceBlock(source: string, openBraceIndex: number): string | null {
  let depth = 0
  let stringQuote: '"' | "'" | '`' | null = null
  let escapeNext = false

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index]!

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (stringQuote) {
      if (char === '\\') {
        escapeNext = true
        continue
      }
      if (char === stringQuote) stringQuote = null
      continue
    }

    if (char === '"' || char === '\'' || char === '`') {
      stringQuote = char
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(openBraceIndex + 1, index)
    }
  }

  return null
}

function findRuntimeApiViolations(
  source: string,
  file: string,
  label: string,
  startRegex: RegExp,
  argumentIndex: number,
  quranWsSymbols: Set<string>,
): string[] {
  const violations: string[] = []
  for (const match of source.matchAll(startRegex)) {
    const callStart = match.index
    if (typeof callStart !== 'number') continue
    const openParenIndex = callStart + match[0].length - 1
    const parsed = extractInvocationArgument(source, openParenIndex, argumentIndex)
    if (!parsed) continue
    if (!expressionContainsQuranWs(parsed.argument, quranWsSymbols)) continue
    violations.push(`${file} -> ${label}: ${source.slice(callStart, parsed.callEnd + 1).trim()}`)
  }
  return violations
}

function extractInvocationArgument(
  source: string,
  openParenIndex: number,
  argumentIndex: number,
): { argument: string, callEnd: number } | null {
  let depth = 0
  let current = ''
  const argumentsSeen: string[] = []
  let stringQuote: '"' | "'" | '`' | null = null
  let escapeNext = false
  let callEnd = -1

  for (let index = openParenIndex + 1; index < source.length; index += 1) {
    const char = source[index]!

    if (escapeNext) {
      current += char
      escapeNext = false
      continue
    }

    if (stringQuote) {
      current += char
      if (char === '\\') {
        escapeNext = true
        continue
      }
      if (char === stringQuote) stringQuote = null
      continue
    }

    if (char === '"' || char === '\'' || char === '`') {
      stringQuote = char
      current += char
      continue
    }

    if (char === '(' || char === '[' || char === '{') {
      depth += 1
      current += char
      continue
    }

    if (char === ')' || char === ']' || char === '}') {
      if (char === ')' && depth === 0) {
        argumentsSeen.push(current.trim())
        callEnd = index
        break
      }
      depth -= 1
      current += char
      continue
    }

    if (char === ',' && depth === 0) {
      argumentsSeen.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  const argument = argumentsSeen[argumentIndex]?.trim()
  if (!argument || callEnd === -1) return null

  return { argument, callEnd }
}

describe('reader-first import guard helpers', () => {
  it('keeps continuity under active-file scanning and runtime-domain direction checks', () => {
    expect(ACTIVE_ROOTS).toContain('src/continuity')
    expect(RUNTIME_DOMAIN_ROOTS).toContain('src/continuity')
  })

  it('ignores type-only imports when collecting runtime dependencies', () => {
    const tempDir = path.join(PROJECT_ROOT, '.scratch')
    const tempFile = path.join(tempDir, 'import-guard-type-only.ts')
    fs.mkdirSync(tempDir, { recursive: true })
    fs.writeFileSync(
      tempFile,
      [
        "import type { Riwayah } from '../src/configure/riwayah'",
        "export type { Riwayah as ReaderRiwayah } from '../src/configure/riwayah'",
        "import { settings } from '../src/configure/state.svelte'",
      ].join('\n'),
      'utf8',
    )

    try {
      expect(extractImports('.scratch/import-guard-type-only.ts')).toEqual([
        {
          importer: '.scratch/import-guard-type-only.ts',
          specifier: '../src/configure/state.svelte',
          kind: 'static',
          resolved: 'src/configure/state.svelte',
        },
      ])
    } finally {
      fs.rmSync(tempFile, { force: true })
    }
  })

  it('ignores inline type-only specifiers when the whole import is type-only', () => {
    const tempDir = path.join(PROJECT_ROOT, '.scratch')
    const tempFile = path.join(tempDir, 'import-guard-inline-type-only.ts')
    fs.mkdirSync(tempDir, { recursive: true })
    fs.writeFileSync(
      tempFile,
      [
        "import { type Riwayah } from '../src/configure/riwayah'",
        "export { type Riwayah as ReaderRiwayah } from '../src/configure/riwayah'",
        "import { type Riwayah as ReaderRiwayah, loadRiwayah } from '../src/configure/riwayah'",
      ].join('\n'),
      'utf8',
    )

    try {
      expect(extractImports('.scratch/import-guard-inline-type-only.ts')).toEqual([
        {
          importer: '.scratch/import-guard-inline-type-only.ts',
          specifier: '../src/configure/riwayah',
          kind: 'static',
          resolved: 'src/configure/riwayah',
        },
      ])
    } finally {
      fs.rmSync(tempFile, { force: true })
    }
  })

  it('resolves relative, project-root, and absolute project-internal specifiers', () => {
    expect(resolveSpecifier('src/App.svelte', './mark/tag/sheet-bridge')).toBe('src/mark/tag/sheet-bridge')
    expect(resolveSpecifier('src/core/router.ts', 'src/mark/store')).toBe('src/mark/store')
    expect(resolveSpecifier('src/core/router.ts', '/src/review/Hub.svelte')).toBe('src/review/Hub.svelte')
    expect(resolveSpecifier('src/core/router.ts', 'data/catalog/source.json')).toBe('data/catalog/source.json')
    expect(resolveSpecifier('src/core/router.ts', '/scripts/check-no-feature-state.js')).toBe('scripts/check-no-feature-state.js')
    expect(resolveSpecifier('src/core/router.ts', 'svelte')).toBeNull()
  })

  it('flags obvious same-file quran.ws URL variables only when runtime network APIs use them', () => {
    const provenanceOnly = `
      const sourceUrl = 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf'
      const attribution = { provider: 'quran.ws', sourceUrl }
    `
    const runtimeUsage = `
      const sourceUrl = 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf'
      const requestUrl = sourceUrl
      void fetch(requestUrl)
    `

    const provenanceViolations = findQuranWsRuntimeViolations(provenanceOnly, 'provenance.ts')
    const runtimeViolations = findQuranWsRuntimeViolations(runtimeUsage, 'runtime.ts')

    expect(provenanceViolations).toEqual([])
    expect(runtimeViolations).toEqual(['runtime.ts -> fetch: fetch(requestUrl)'])
  })

  it('flags computed quran.ws runtime usage through import() and new URL() wrappers', () => {
    const runtimeUsage = `
      const base = \`https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-\${page}.pdf\`
      const importUrl = base
      const fetchUrl = base
      const requestUrl = base
      const beaconUrl = base
      const socketUrl = \`wss://stream.quran.ws/live/\${channel}\`
      const eventSourceUrl = base
      const xhrUrl = base

      void import(importUrl)
      void fetch(new URL(fetchUrl))
      void new Request(new URL(requestUrl))
      void navigator.sendBeacon(new URL(beaconUrl))
      void new WebSocket(new URL(socketUrl))
      void new EventSource(new URL(eventSourceUrl))
      xhr.open('GET', new URL(xhrUrl))
    `

    expect(findQuranWsRuntimeViolations(runtimeUsage, 'runtime.ts')).toEqual([
      'runtime.ts -> EventSource: new EventSource(new URL(eventSourceUrl))',
      'runtime.ts -> Request: new Request(new URL(requestUrl))',
      'runtime.ts -> WebSocket: new WebSocket(new URL(socketUrl))',
      'runtime.ts -> XMLHttpRequest.open: open(\'GET\', new URL(xhrUrl))',
      'runtime.ts -> dynamic import: import(importUrl)',
      'runtime.ts -> fetch: fetch(new URL(fetchUrl))',
      'runtime.ts -> sendBeacon: sendBeacon(new URL(beaconUrl))',
    ])
  })

  it('flags quran.ws-bearing function and member expressions when runtime APIs use them', () => {
    const runtimeUsage = `
      function getQuranWsUrl() {
        return 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf'
      }

      function loadQuranWsSpecifier() {
        return getQuranWsUrl()
      }

      const requestUrl = new URL(getQuranWsUrl())
      const url = requestUrl

      void fetch(getQuranWsUrl())
      void import(loadQuranWsSpecifier())
      xhr.open('GET', requestUrl.toString())
      void fetch(url.href)
    `

    expect(findQuranWsRuntimeViolations(runtimeUsage, 'runtime.ts')).toEqual([
      'runtime.ts -> XMLHttpRequest.open: open(\'GET\', requestUrl.toString())',
      'runtime.ts -> dynamic import: import(loadQuranWsSpecifier())',
      'runtime.ts -> fetch: fetch(getQuranWsUrl())',
      'runtime.ts -> fetch: fetch(url.href)',
    ])
  })

  it('tracks multiline initializers, arrow functions, and simple method bodies without flagging provenance-only strings', () => {
    const provenanceOnly = `
      const sourceUrl =
        'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf'

      const getSourceUrl = () =>
        sourceUrl

      const helper = {
        getSourceUrl() {
          return getSourceUrl()
        },
      }

      class ProvenanceOnly {
        getSourceUrl() {
          return helper.getSourceUrl()
        }
      }

      const attribution = {
        provider: 'quran.ws',
        sourceUrl: new ProvenanceOnly().getSourceUrl(),
      }
    `

    const runtimeUsage = `
      const sourceUrl =
        'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf'

      const getSourceUrl = () =>
        sourceUrl

      const helper = {
        getSourceUrl() {
          return getSourceUrl()
        },
      }

      class RuntimeUrls {
        getSourceUrl() {
          return helper.getSourceUrl()
        }
      }

      const urls = new RuntimeUrls()

      void fetch(getSourceUrl())
      void import(helper.getSourceUrl())
      xhr.open('GET', urls.getSourceUrl())
    `

    expect(findQuranWsRuntimeViolations(provenanceOnly, 'provenance.ts')).toEqual([])
    expect(findQuranWsRuntimeViolations(runtimeUsage, 'runtime.ts')).toEqual([
      'runtime.ts -> XMLHttpRequest.open: open(\'GET\', urls.getSourceUrl())',
      'runtime.ts -> dynamic import: import(helper.getSourceUrl())',
      'runtime.ts -> fetch: fetch(getSourceUrl())',
    ])
  })

  it('tracks quran.ws-bearing class bodies completely when later methods define the tracked runtime instance', () => {
    const runtimeUsage = `
      class MultiMethodUrls {
        firstHelper() {
          return 'not-a-url'
        }

        secondHelper() {
          return 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf'
        }
      }

      const requestUrl = new MultiMethodUrls()
      void fetch(requestUrl.href)
    `

    expect(findQuranWsRuntimeViolations(runtimeUsage, 'runtime.ts')).toEqual([
      'runtime.ts -> fetch: fetch(requestUrl.href)',
    ])
  })

  it('flags obvious member-constructor runtime forms for Request, WebSocket, and EventSource', () => {
    const runtimeUsage = `
      const requestUrl = 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-1.pdf'
      const socketUrl = 'wss://stream.quran.ws/live/channel'
      const eventSourceUrl = 'https://stream.quran.ws/events'

      void new window.Request(requestUrl)
      void new globalThis.WebSocket(socketUrl)
      void new self.EventSource(eventSourceUrl)
    `

    expect(findQuranWsRuntimeViolations(runtimeUsage, 'runtime.ts')).toEqual([
      'runtime.ts -> EventSource: new self.EventSource(eventSourceUrl)',
      'runtime.ts -> Request: new window.Request(requestUrl)',
      'runtime.ts -> WebSocket: new globalThis.WebSocket(socketUrl)',
    ])
  })

  it('flags static external import and export-from quran.ws forms', () => {
    const runtimeUsage = `
      import reader from 'https://cdn.quran.ws/runtime/reader.js'
      export { reader } from 'https://cdn.quran.ws/runtime/reader.js'
    `

    expect(findQuranWsRuntimeViolations(runtimeUsage, 'runtime.ts')).toEqual([
      'runtime.ts -> static import: export { reader } from \'https://cdn.quran.ws/runtime/reader.js\'',
      'runtime.ts -> static import: import reader from \'https://cdn.quran.ws/runtime/reader.js\'',
    ])
  })
})

describe('reader-first import guards', () => {
  const activeFiles = ACTIVE_ROOTS.flatMap(listSourceFiles).sort()
  const activeImports = activeFiles.flatMap(extractImports)
  const runtimeFiles = listSourceFiles('src').sort()

  it('keeps active reader-first runtime files out of removed listen/mark/review surfaces except exact temporary shims', () => {
    const removedScopeImports = activeImports.filter((entry) => matchesPrefix(entry.resolved, REMOVED_SCOPE_PREFIXES))

    assertOnlyAllowedPairs(
      'Reader First removed-scope guard failed.',
      removedScopeImports,
      REMOVED_SCOPE_ALLOWANCES,
    )
  })

  it('keeps App.svelte free of removed-scope and mark-only root overlay mounts', () => {
    const appSource = readFile('src/App.svelte')

    expect(appSource).not.toContain("import { undoToastBridge } from './core/ui-bridge'")
    expect(appSource).not.toContain("import { tagSheetBridge } from './mark/tag/sheet-bridge'")
    expect(appSource).not.toContain("void import('./core/ui.svelte')")
    expect(appSource).not.toContain("void import('./mark/tag/TagSheet.svelte')")
    expect(appSource).not.toContain('undoToastMounted')
    expect(appSource).not.toContain('tagSheetMounted')
    expect(appSource).not.toContain('UndoToastComp')
    expect(appSource).not.toContain('TagSheetComp')
  })

  it('removes mark-review-only support files and reader undo bridge callers once the slice is complete', () => {
    const readerSource = readFile('src/read/Reader.svelte')
    const lingeringSupportFiles = REMOVED_SUPPORT_FILES.filter((file) => fs.existsSync(path.join(PROJECT_ROOT, file)))

    expect(
      lingeringSupportFiles,
      'Removed mark/review support files should be deleted instead of lingering as dead code.',
    ).toEqual([])
    expect(readerSource).not.toContain("import { clearUndoToast, clearUndoRecord } from '../core/ui-bridge'")
    expect(readerSource).not.toContain('clearUndoToast()')
    expect(readerSource).not.toContain('clearUndoRecord()')
  })

  it('keeps core/data/infra runtime domains from importing user-facing surfaces except exact temporary allowances', () => {
    const runtimeDomainImports = RUNTIME_DOMAIN_ROOTS
      .flatMap(listSourceFiles)
      .sort()
      .flatMap(extractImports)
      .filter((entry) => matchesPrefix(entry.resolved, USER_SURFACE_PREFIXES))

    assertOnlyAllowedPairs(
      'Reader First domain-direction guard failed.',
      runtimeDomainImports,
      DOMAIN_DIRECTION_ALLOWANCES,
    )
  })

  it('prevents src runtime modules from importing build-only data or scripts', () => {
    const buildOnlyImports = runtimeFiles
      .flatMap(extractImports)
      .filter((entry) => matchesPrefix(entry.resolved, BUILD_ONLY_PREFIXES))
      .map(formatRecord)
      .sort()

    expect(
      buildOnlyImports,
      'Runtime src/** modules must not import from data/catalog/**, data/normalized/**, data/taxonomy/**, or scripts/**.',
    ).toEqual([])
  })

  it('forbids runtime fetch/import/network requests to quran.ws while allowing provenance-only strings', () => {
    const violations = runtimeFiles
      .flatMap((file) => findQuranWsRuntimeViolations(readFile(file), file))
      .sort()

    expect(
      violations,
      'Runtime code under src/** must not fetch/import/request quran.ws directly.',
    ).toEqual([])
  })

  it('keeps src/styles/index.css free of removed tag/mark/review surface imports', () => {
    const stylesheet = readFile('src/styles/index.css')

    expect(stylesheet).not.toContain("@import url('./surfaces/tag.css');")
    expect(stylesheet).not.toContain("@import url('./surfaces/tag-slots.css');")
    expect(stylesheet).not.toContain("@import url('./surfaces/marks.css');")
    expect(stylesheet).not.toContain("@import url('./surfaces/review.css');")
    expect(stylesheet).not.toContain("@import url('./surfaces/audio.css');")
  })

  it('keeps active surfaces on direct packs and continuity domain entrypoints once those domains exist', () => {
    const legacyShims = new Set([
      'src/data/mushaf-pages',
      'src/data/riwayah-packages',
      'src/navigate/bookmarks/store',
      'src/read/global-position',
    ])
    const activeSurfaceRoots = ['src/read', 'src/navigate', 'src/configure', 'src/onboard']
    const shimImports = activeSurfaceRoots
      .flatMap(listSourceFiles)
      .sort()
      .flatMap(extractImports)
      .filter((entry) => entry.resolved !== null && legacyShims.has(entry.resolved))
      .map(formatRecord)
      .sort()

    expect(
      shimImports,
      'Active surfaces must import packs/continuity entrypoints directly instead of legacy shim modules.',
    ).toEqual([])
  })
})
