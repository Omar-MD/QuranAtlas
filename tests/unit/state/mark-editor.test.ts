import { describe, it, expect, beforeEach } from 'vitest'
import { markEditor } from '../../../src/state/mark-editor.svelte.ts'

describe('state/mark-editor.svelte.ts', () => {
  beforeEach(() => {
    markEditor.isOpen = false
    markEditor.currentVerseKey = null
    markEditor.selectedTags = []
    markEditor.draftNote = ''
  })

  it('has correct initial state', () => {
    expect(markEditor.isOpen).toBe(false)
    expect(markEditor.currentVerseKey).toBeNull()
    expect(markEditor.selectedTags).toEqual([])
    expect(markEditor.draftNote).toBe('')
  })

  it('fields are directly assignable', () => {
    markEditor.isOpen = true
    markEditor.currentVerseKey = '2:255'
    expect(markEditor.isOpen).toBe(true)
    expect(markEditor.currentVerseKey).toBe('2:255')
    expect(markEditor.draftNote).toBe('') // untouched
  })

  it('multiple fields can be patched via Object.assign', () => {
    Object.assign(markEditor, { isOpen: true, draftNote: 'a reflection' })
    expect(markEditor.isOpen).toBe(true)
    expect(markEditor.draftNote).toBe('a reflection')
    expect(markEditor.currentVerseKey).toBeNull() // untouched
  })
})
