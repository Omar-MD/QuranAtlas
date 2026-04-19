import { describe, it, expect, beforeEach } from 'vitest'
import { commandSheet } from '../../../src/state/command-sheet.svelte.ts'

describe('state/command-sheet.svelte.ts', () => {
  beforeEach(() => {
    commandSheet.query = ''
    commandSheet.results = []
    commandSheet.focusIndex = 0
    commandSheet.isOpen = false
  })

  it('has correct initial state', () => {
    expect(commandSheet.query).toBe('')
    expect(commandSheet.results).toEqual([])
    expect(commandSheet.focusIndex).toBe(0)
    expect(commandSheet.isOpen).toBe(false)
  })

  it('fields are directly assignable', () => {
    commandSheet.query = 'baqarah'
    commandSheet.isOpen = true
    expect(commandSheet.query).toBe('baqarah')
    expect(commandSheet.isOpen).toBe(true)
    expect(commandSheet.focusIndex).toBe(0) // untouched
  })

  it('multiple fields can be patched via Object.assign', () => {
    Object.assign(commandSheet, { query: 'test', focusIndex: 2 })
    expect(commandSheet.query).toBe('test')
    expect(commandSheet.focusIndex).toBe(2)
    expect(commandSheet.isOpen).toBe(false) // untouched
  })
})
