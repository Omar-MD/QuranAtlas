import { describe, it, expect, beforeEach } from 'vitest'
import { ambientChrome } from '../../../src/read/state-ambient.svelte.ts'

describe('state/ambient-chrome.svelte.ts', () => {
  beforeEach(() => {
    ambientChrome.dockVisible = true
    ambientChrome.pillLabel = ''
    ambientChrome.dockFadeTimerHandle = null
    ambientChrome.pillFadeTimerHandle = null
  })

  it('has correct initial state', () => {
    expect(ambientChrome.dockVisible).toBe(true)
    expect(ambientChrome.pillLabel).toBe('')
    expect(ambientChrome.dockFadeTimerHandle).toBeNull()
    expect(ambientChrome.pillFadeTimerHandle).toBeNull()
  })

  it('fields are directly assignable', () => {
    ambientChrome.dockVisible = false
    expect(ambientChrome.dockVisible).toBe(false)
    expect(ambientChrome.pillLabel).toBe('') // untouched
  })

  it('multiple fields can be patched via Object.assign', () => {
    Object.assign(ambientChrome, { dockVisible: false, pillLabel: '2:255 · Al-Baqarah' })
    expect(ambientChrome.dockVisible).toBe(false)
    expect(ambientChrome.pillLabel).toBe('2:255 · Al-Baqarah')
    expect(ambientChrome.dockFadeTimerHandle).toBeNull() // untouched
  })
})
