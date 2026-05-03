import { describe, it, expect, beforeEach } from 'vitest'
import { settings } from '../../../src/configure/state.svelte.ts'

describe('state/settings.svelte.ts', () => {
  beforeEach(() => {
    settings.theme = 'auto'
    settings.fontSize = 'md'
    settings.translationId = 'bridges'
    settings.tafsirId = 'muyassar'
    settings.translationVisible = true
    settings.surahHeaderHidden = false
  })

  it('has correct initial state', () => {
    expect(settings.theme).toBe('auto')
    expect(settings.fontSize).toBe('md')
    expect(settings.translationId).toBe('bridges')
    expect(settings.tafsirId).toBe('muyassar')
    expect(settings.translationVisible).toBe(true)
  })

  it('fields are directly assignable', () => {
    settings.theme = 'dark'
    expect(settings.theme).toBe('dark')
    expect(settings.fontSize).toBe('md') // untouched
  })

  it('multiple fields can be patched via Object.assign', () => {
    Object.assign(settings, { theme: 'sepia', translationVisible: false })
    expect(settings.theme).toBe('sepia')
    expect(settings.translationVisible).toBe(false)
    expect(settings.fontSize).toBe('md') // untouched
  })

  it('exposes surahHeaderHidden default false', () => {
    expect(settings.surahHeaderHidden).toBe(false)
  })

  it('surahHeaderHidden is directly assignable', () => {
    settings.surahHeaderHidden = true
    expect(settings.surahHeaderHidden).toBe(true)
  })
})
