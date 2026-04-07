/**
 * Shared UI utilities for Quran Atlas.
 * Contains common UI patterns like undo toast to avoid duplication.
 */

import { emit } from './events.js'
import { UI } from './constants.js'

let undoTimer = null
let undoRecord = null

const UNDO_TIMEOUT_MS = UI.UNDO_TIMEOUT_MS

/**
 * Show an undo toast notification after a deletion.
 * @param {Object} options
 * @param {string} options.verseKey - The verse key that was deleted (e.g., '2:255')
 * @param {Object} options.record - The full mark record to restore on undo
 * @param {Function} options.onUndo - Callback to execute when undo is clicked (should restore the mark)
 * @param {Function} options.onComplete - Callback to execute when toast is dismissed (timeout or manual close)
 */
export function showUndoToast({ verseKey, record, onUndo, onComplete }) {
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
      emit('marks:undo', { verseKey: undoRecord.verseKey })
      undoRecord = null
    }
    clearUndoToast()
    if (onComplete) onComplete()
  })

  toast.appendChild(text)
  toast.appendChild(undoBtn)

  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(toast)

  undoTimer = setTimeout(() => {
    clearUndoToast()
    undoRecord = null
    if (onComplete) onComplete()
  }, UNDO_TIMEOUT_MS)
}

/**
 * Clear the undo toast and cancel the timeout.
 */
export function clearUndoToast() {
  if (undoTimer) {
    clearTimeout(undoTimer)
    undoTimer = null
  }
  const toast = document.querySelector('.qa-undo-toast')
  if (toast) toast.remove()
}

/**
 * Clear the undo record without removing the toast.
 * Call this when navigating away to prevent stale data.
 */
export function clearUndoRecord() {
  undoRecord = null
}
