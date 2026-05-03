import { describe, it, expect, beforeEach } from 'vitest'
import { reader } from '../../../src/read/state.svelte.ts'

describe('state/reader.svelte.ts', () => {
  beforeEach(() => {
    reader.currentSurah = null
    reader.currentSurahNum = null
    reader.currentVerseKey = null
    reader.fontMultiplier = 1.0
    reader.translationVisible = true
    reader.scrollY = 0
    reader.renderedCount = 0
    reader.isRendering = false
    reader.scrollAppendRafPending = false
    reader.lastTrackedVerse = null
    reader.surahHeaderHidden = false
  })

  it('has correct initial state', () => {
    expect(reader.currentSurah).toBeNull()
    expect(reader.currentSurahNum).toBeNull()
    expect(reader.currentVerseKey).toBeNull()
    expect(reader.fontMultiplier).toBe(1.0)
    expect(reader.translationVisible).toBe(true)
    expect(reader.scrollY).toBe(0)
    expect(reader.renderedCount).toBe(0)
    expect(reader.isRendering).toBe(false)
    expect(reader.scrollAppendRafPending).toBe(false)
    expect(reader.lastTrackedVerse).toBeNull()
  })

  it('fields are directly assignable', () => {
    reader.currentVerseKey = '2:255'
    expect(reader.currentVerseKey).toBe('2:255')
    expect(reader.fontMultiplier).toBe(1.0) // untouched
  })

  it('multiple fields can be patched via Object.assign', () => {
    Object.assign(reader, { scrollY: 500, isRendering: true })
    expect(reader.scrollY).toBe(500)
    expect(reader.isRendering).toBe(true)
    expect(reader.currentVerseKey).toBeNull() // untouched
  })

  it('assignment does not throw', () => {
    expect(() => { reader.scrollY = 500 }).not.toThrow()
  })

  it('exposes surahHeaderHidden default false and is assignable', () => {
    expect(reader.surahHeaderHidden).toBe(false)
    reader.surahHeaderHidden = true
    expect(reader.surahHeaderHidden).toBe(true)
    reader.surahHeaderHidden = false
  })
})
