import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'

function walk(dir, exts, repoRoot) {
  const out = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const full = `${dir}/${entry}`
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walk(full, exts, repoRoot))
    else if (exts.some(e => full.endsWith(e))) out.push(relative(repoRoot, full))
  }
  return out
}

describe('animations consolidation', () => {
  const repoRoot = process.cwd()
  const animationsCss = readFileSync(resolve(repoRoot, 'src/styles/animations.css'), 'utf8')

  it('contains every keyframe used by the app', () => {
    const required = [
      'qa-sheet-fade',
      'qa-sheet-rise',
      'qa-modal-scale-in',
      'qa-skeleton-shimmer',
      'qa-spotlight-fade',
      'qa-spotlight-pulse',
    ]
    for (const name of required) {
      expect(animationsCss).toMatch(new RegExp(`@keyframes\\s+${name}\\b`))
    }
  })

  it('no @keyframes defined outside animations.css', () => {
    const files = walk(resolve(repoRoot, 'src'), ['.css', '.svelte'], repoRoot)
    const offenders = []
    for (const rel of files) {
      if (rel === 'src/styles/animations.css') continue
      const content = readFileSync(resolve(repoRoot, rel), 'utf8')
      if (/@keyframes\s+\w/.test(content)) offenders.push(rel)
    }
    expect(offenders).toEqual([])
  })
})
