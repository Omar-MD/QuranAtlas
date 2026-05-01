import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Audit R-19 / R-32 / N24 (2026-04-29) — CSP allow-list registry.
 *
 * Asserts that `public/_headers` matches the policy documented at
 * `docs/context/csp-allowlist.md`. Adding or widening a directive requires
 * editing all three (doc + `_headers` + this test) in the same commit so that
 * the registry, deployed policy, and regression guard stay in lockstep.
 */

const HEADERS_PATH = resolve(__dirname, '../../../public/_headers')
const REGISTRY_PATH = resolve(__dirname, '../../../docs/context/csp-allowlist.md')

const EXPECTED_DIRECTIVES: Record<string, string[]> = {
  'default-src':     ["'self'"],
  'script-src':      ["'self'"],
  'style-src':       ["'self'", "'unsafe-inline'"],
  'font-src':        ["'self'", 'data:'],
  'img-src':         ["'self'", 'data:'],
  'connect-src':     ["'self'"],
  'base-uri':        ["'self'"],
  'form-action':     ["'none'"],
  'frame-ancestors': ["'none'"],
  'manifest-src':    ["'self'"],
  'worker-src':      ["'self'"],
}

const FORBIDDEN_TOKENS = [
  "'unsafe-eval'",
  "'wasm-unsafe-eval'",
  "'unsafe-hashes'",
]

const EXPECTED_OTHER_HEADERS: Record<string, string> = {
  'X-Frame-Options':            'DENY',
  'X-Content-Type-Options':     'nosniff',
  'Referrer-Policy':            'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

function parseCsp(line: string): Record<string, string[]> {
  const policy = line.replace(/^.*Content-Security-Policy:\s*/, '').trim()
  const out: Record<string, string[]> = {}
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) { continue }
    const [name, ...values] = tokens
    out[name] = values
  }
  return out
}

function findHeader(headersFile: string, name: string): string | undefined {
  const re = new RegExp(`^\\s+${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}:\\s*(.+)$`, 'mi')
  const m = headersFile.match(re)
  return m ? m[1].trim() : undefined
}

describe('public/_headers CSP', () => {
  const headersFile = readFileSync(HEADERS_PATH, 'utf8')
  const cspLine = headersFile.split('\n').find((l) => l.includes('Content-Security-Policy:'))

  it('declares a Content-Security-Policy header on the global / route', () => {
    expect(cspLine, 'expected a Content-Security-Policy line on the global `/*` route').toBeTruthy()
  })

  it('matches every directive declared in docs/context/csp-allowlist.md', () => {
    expect(cspLine).toBeDefined()
    const parsed = parseCsp(cspLine!)
    for (const [directive, expectedValues] of Object.entries(EXPECTED_DIRECTIVES)) {
      expect(parsed[directive], `directive ${directive} missing from _headers`).toBeDefined()
      expect(parsed[directive].sort(), `directive ${directive} drifted vs csp-allowlist.md`)
        .toEqual([...expectedValues].sort())
    }
  })

  it('declares no directives beyond the registry (no silent widening)', () => {
    expect(cspLine).toBeDefined()
    const parsed = parseCsp(cspLine!)
    const extras = Object.keys(parsed).filter((d) => !(d in EXPECTED_DIRECTIVES))
    expect(extras, 'extra CSP directives in _headers must be added to csp-allowlist.md first').toEqual([])
  })

  it('contains no forbidden tokens (`unsafe-eval`, `unsafe-hashes`, wildcards)', () => {
    expect(cspLine).toBeDefined()
    for (const token of FORBIDDEN_TOKENS) {
      expect(cspLine).not.toContain(token)
    }
    const parsed = parseCsp(cspLine!)
    for (const [directive, values] of Object.entries(parsed)) {
      expect(values, `directive ${directive} contains a wildcard`).not.toContain('*')
    }
  })

  it('declares the defence-in-depth security headers', () => {
    for (const [name, value] of Object.entries(EXPECTED_OTHER_HEADERS)) {
      expect(findHeader(headersFile, name), `${name} header missing`).toBe(value)
    }
  })

  it('declares a Permissions-Policy with payment + camera + microphone denied', () => {
    const value = findHeader(headersFile, 'Permissions-Policy')
    expect(value).toBeTruthy()
    expect(value).toMatch(/camera=\(\)/)
    expect(value).toMatch(/microphone=\(\)/)
    expect(value).toMatch(/payment=\(\)/)
    expect(value).toMatch(/geolocation=\(\)/)
  })
})

describe('docs/context/csp-allowlist.md registry', () => {
  const registry = readFileSync(REGISTRY_PATH, 'utf8')

  it('lists every directive currently in _headers', () => {
    for (const directive of Object.keys(EXPECTED_DIRECTIVES)) {
      expect(registry, `csp-allowlist.md missing row for ${directive}`).toContain(directive)
    }
  })

  it('flags the forbidden tokens explicitly', () => {
    for (const token of FORBIDDEN_TOKENS) {
      expect(registry).toContain(token)
    }
  })
})
