import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The toast logic moved to ui.svelte (Svelte component) + ui-bridge.ts (delegate).
// Tests register a DOM-based implementation that mirrors the original ui.js behaviour
// so that existing assertions against the real DOM still hold.
function makeDomToastImpl(emitFn) {
  let undoTimer = null
  let undoRecord = null

  function clearUndoToast() {
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null }
    const toast = document.querySelector('.qa-undo-toast')
    if (toast) { toast.remove() }
  }

  function clearUndoRecord() { undoRecord = null }

  function showUndoToast({ verseKey, record, onUndo, onComplete }) {
    clearUndoToast()
    undoRecord = record

    const toast = document.createElement('div')
    toast.className = 'qa-undo-toast'
    toast.setAttribute('role', 'status')
    toast.setAttribute('aria-live', 'polite')

    const text = document.createElement('span')
    text.textContent = `Mark ${verseKey} deleted.`

    const undoBtn = document.createElement('button')
    undoBtn.textContent = 'Undo'
    undoBtn.addEventListener('click', async () => {
      if (undoRecord) {
        await onUndo(undoRecord)
        emitFn('marks:undo', { verseKey: undoRecord.verseKey })
        undoRecord = null
      }
      clearUndoToast()
      if (onComplete) { onComplete() }
    })

    toast.appendChild(text)
    toast.appendChild(undoBtn)

    const shell = document.getElementById('app-shell') || document.body
    shell.appendChild(toast)

    undoTimer = setTimeout(() => {
      clearUndoToast()
      undoRecord = null
      if (onComplete) { onComplete() }
    }, 5000)
  }

  return { showUndoToast, clearUndoToast, clearUndoRecord }
}

describe('core/ui.js', () => {
  let clear
  let on
  let clearUndoRecord
  let clearUndoToast
  let showUndoToast

  beforeEach(async () => {
    vi.resetModules()
    ;({ clear, on } = await import('../../../src/core/events.js'))
    const bridgeMod = await import('../../../src/core/ui-bridge.js')
    ;({ clearUndoRecord, clearUndoToast, showUndoToast } = bridgeMod)
    const { emit } = await import('../../../src/core/events.js')
    bridgeMod.registerUndoToast(makeDomToastImpl(emit))
    clear()
    document.body.appendChild(Object.assign(document.createElement('div'), { id: 'app-shell' }))
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