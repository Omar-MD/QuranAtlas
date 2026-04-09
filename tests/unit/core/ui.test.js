import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('core/ui.js', () => {
  let clear
  let on
  let clearUndoRecord
  let clearUndoToast
  let showUndoToast

  beforeEach(async () => {
    vi.resetModules()
    ;({ clear, on } = await import('../../../src/core/events.js'))
    ;({ clearUndoRecord, clearUndoToast, showUndoToast } = await import('../../../src/core/ui.js'))
    clear()
    document.body.innerHTML = '<div id="app-shell"></div>'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an undo toast and auto-dismisses it after the timeout', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()

    showUndoToast({
      verseKey: '2:255',
      record: { verseKey: '2:255', tags: ['study'] },
      onUndo: vi.fn(),
      onComplete,
    })

    expect(document.querySelector('.qa-undo-toast')).not.toBeNull()

    await vi.advanceTimersByTimeAsync(5000)

    expect(document.querySelector('.qa-undo-toast')).toBeNull()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('undo restores the deleted mark and emits marks:undo', async () => {
    const undoHandler = vi.fn()
    const undoEvent = vi.fn()
    on('marks:undo', undoEvent)

    showUndoToast({
      verseKey: '2:255',
      record: { verseKey: '2:255', tags: ['study'] },
      onUndo: undoHandler,
      onComplete: vi.fn(),
    })

    document.querySelector('.qa-undo-toast button').click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(undoHandler).toHaveBeenCalledWith({ verseKey: '2:255', tags: ['study'] })
    expect(undoEvent).toHaveBeenCalledWith({ verseKey: '2:255' })
    expect(document.querySelector('.qa-undo-toast')).toBeNull()
  })

  it('clearUndoRecord prevents stale undo data from being restored', async () => {
    const undoHandler = vi.fn()

    showUndoToast({
      verseKey: '2:255',
      record: { verseKey: '2:255', tags: ['study'] },
      onUndo: undoHandler,
      onComplete: vi.fn(),
    })

    clearUndoRecord()
    document.querySelector('.qa-undo-toast button').click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(undoHandler).not.toHaveBeenCalled()
    expect(document.querySelector('.qa-undo-toast')).toBeNull()
  })

  it('falls back to document.body when app-shell is unavailable', async () => {
    document.body.innerHTML = ''

    showUndoToast({
      verseKey: '1:1',
      record: { verseKey: '1:1', tags: ['favourite'] },
      onUndo: vi.fn(),
      onComplete: vi.fn(),
    })

    expect(document.body.querySelector('.qa-undo-toast')).not.toBeNull()
    clearUndoToast()
  })
})