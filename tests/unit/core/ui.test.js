import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The toast logic moved to ui.svelte (Svelte component) + ui-bridge.ts
// (createOverlayBridge consumer, audit N22). Tests register a DOM-based
// implementation that mirrors the original ui.js behaviour so existing
// assertions against the real DOM still hold. The implementation now
// matches the OverlayBridge<UndoToastAPI> shape (open/close/isOpen/clearRecord);
// public wrappers showUndoToast / clearUndoToast / clearUndoRecord on the
// bridge module dispatch through bridge.api.<method>().
function makeDomToastImpl(emitFn) {
  let undoTimer = null
  let undoRecord = null
  let visible = false

  function close() {
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null }
    visible = false
    const toast = document.querySelector('.qa-undo-toast')
    if (toast) { toast.remove() }
  }

  function clearRecord() { undoRecord = null }

  function open({ verseKey, record, onUndo, onComplete }) {
    close()
    undoRecord = record
    visible = true

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
      close()
      if (onComplete) { onComplete() }
    })

    toast.appendChild(text)
    toast.appendChild(undoBtn)

    const shell = document.getElementById('app-shell') || document.body
    shell.appendChild(toast)

    undoTimer = setTimeout(() => {
      close()
      undoRecord = null
      if (onComplete) { onComplete() }
    }, 5000)
  }

  return { open, close, isOpen: () => visible, clearRecord }
}

describe('core/ui-bridge', () => {
  let clear
  let on
  let clearUndoRecord
  let clearUndoToast
  let showUndoToast

  beforeEach(async () => {
    vi.resetModules()
    ;({ clear, on } = await import('../../../src/core/events.js'))
    const bridgeMod = await import('../../../src/core/ui-bridge.ts')
    ;({ clearUndoRecord, clearUndoToast, showUndoToast } = bridgeMod)
    const { emit } = await import('../../../src/core/events.js')
    bridgeMod.undoToastBridge.register(makeDomToastImpl(emit))
    clear()
    document.body.appendChild(Object.assign(document.createElement('div'), { id: 'app-shell' }))
  })

  afterEach(async () => {
    vi.useRealTimers()
    const bridgeMod = await import('../../../src/core/ui-bridge.ts')
    bridgeMod.undoToastBridge.unregister()
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
    while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }

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
