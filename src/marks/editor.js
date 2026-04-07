/**
 * Mark editor modal.
 * Opens on long-press (touch) or hover-icon click (mouse).
 * Allows assigning/removing tags and deleting marks.
 */

import { save, del, getByVerseKey } from './store.js'
import { getActiveTags } from './tags.js'
import { emit, on } from '../core/events.js'
import { UI, Events } from '../core/constants.js'

const LONG_PRESS_MS = 500
const UNDO_TIMEOUT_MS = UI.UNDO_TIMEOUT_MS

let activeModal = null
let undoTimer = null
let undoRecord = null
let unsubNavNavigate = null

/**
 * Open the mark editor modal for a verse.
 * @param {string} verseKey - e.g. '2:255'
 */
export async function openEditor(verseKey) {
  // Clear any existing undo toast when opening a new editor
  clearUndoToast()
  closeEditor()

  const existing = await getByVerseKey(verseKey)
  const activeTags = await getActiveTags()
  const currentTags = existing ? existing.tags : []

  const backdrop = document.createElement('div')
  backdrop.className = 'qa-mark-backdrop'
  backdrop.addEventListener('click', closeEditor)

  const modal = document.createElement('div')
  modal.className = 'qa-mark-modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', `Mark verse ${verseKey}`)

  const title = document.createElement('h2')
  title.className = 'qa-mark-title'
  title.textContent = `Verse ${verseKey}`
  modal.appendChild(title)

  const tagList = document.createElement('div')
  tagList.className = 'qa-mark-tags'

  for (const tag of activeTags) {
    const label = document.createElement('label')
    label.className = 'qa-mark-tag-label'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = tag.label
    checkbox.checked = currentTags.includes(tag.label)

    const swatch = document.createElement('span')
    swatch.className = 'qa-mark-tag-swatch'
    swatch.style.backgroundColor = tag.color

    const text = document.createTextNode(` ${tag.label}`)

    label.appendChild(checkbox)
    label.appendChild(swatch)
    label.appendChild(text)
    tagList.appendChild(label)
  }
  modal.appendChild(tagList)

  const actions = document.createElement('div')
  actions.className = 'qa-mark-actions'

  const saveBtn = document.createElement('button')
  saveBtn.className = 'qa-mark-save-btn'
  saveBtn.setAttribute('data-action', 'save')
  saveBtn.textContent = 'Save'
  saveBtn.addEventListener('click', async () => {
    const validTags = activeTags.map(t => t.label)
    const selected = Array.from(
      modal.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value).filter(tag => validTags.includes(tag))
    await save(verseKey, selected)
    closeEditor()
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'qa-mark-cancel-btn'
  cancelBtn.setAttribute('data-action', 'cancel')
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', closeEditor)

  actions.appendChild(saveBtn)
  actions.appendChild(cancelBtn)

  if (existing) {
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'qa-mark-delete-btn'
    deleteBtn.setAttribute('data-action', 'delete')
    deleteBtn.textContent = 'Delete'
    deleteBtn.addEventListener('click', async () => {
      undoRecord = existing
      await del(verseKey)
      closeEditor()
      showUndoToast(verseKey)
    })
    actions.appendChild(deleteBtn)
  }

  modal.appendChild(actions)

  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(backdrop)
  shell.appendChild(modal)
  activeModal = { backdrop, modal }

  // Focus trap implementation
  const focusableElements = modal.querySelectorAll(
    'input[type="checkbox"], button:not([disabled])'
  )
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  if (firstFocusable) firstFocusable.focus()

  // Focus trap: cycle within modal
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditor()
      return
    }

    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      // Shift+Tab on first element → go to last
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
      }
    } else {
      // Tab on last element → go to first
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
  })
}

/**
 * Close the active editor modal.
 */
export function closeEditor() {
  if (activeModal) {
    activeModal.backdrop.remove()
    activeModal.modal.remove()
    activeModal = null
  }
}

/**
 * Show undo toast after delete.
 * @param {string} verseKey
 */
function showUndoToast(verseKey) {
  clearUndoToast()

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
      await save(undoRecord.verseKey, undoRecord.tags)
      undoRecord = null
      emit('marks:undo', { verseKey })
    }
    clearUndoToast()
  })

  toast.appendChild(text)
  toast.appendChild(undoBtn)

  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(toast)

  undoTimer = setTimeout(() => {
    clearUndoToast()
    undoRecord = null
  }, UNDO_TIMEOUT_MS)
}

/**
 * Remove the undo toast.
 */
function clearUndoToast() {
  if (undoTimer) {
    clearTimeout(undoTimer)
    undoTimer = null
  }
  const toast = document.querySelector('.qa-undo-toast')
  if (toast) toast.remove()
}

/**
 * Create a bookmark SVG icon element (no innerHTML — safe DOM construction).
 * @returns {SVGElement}
 */
function createBookmarkIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M3 1h10v14l-5-3-5 3V1z')
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

/**
 * Set up long-press detection on a container (event delegation).
 * @param {HTMLElement} container
 * @returns {Function} cleanup function
 */
export function setupLongPress(container) {
  let pressTimer = null
  let touchStartY = null
  let touchStartX = null
  const TOUCH_MOVE_THRESHOLD = 10

  // Clear undo toast on navigation
  unsubNavNavigate = on(Events.NAVIGATION_NAVIGATE, () => {
    clearUndoToast()
    undoRecord = null
  })

  function getVerseKey(element) {
    const verseEl = element.closest('[data-verse]')
    if (!verseEl) return null
    const verseNum = verseEl.getAttribute('data-verse')
    const match = location.hash.match(/#\/s\/(\d+)/)
    const surahNum = match ? match[1] : null
    if (!surahNum || !verseNum) return null
    return `${surahNum}:${verseNum}`
  }

  function onTouchStart(e) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) return
    const touch = e.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    pressTimer = setTimeout(() => {
      openEditor(verseKey)
      pressTimer = null
    }, LONG_PRESS_MS)
  }

  function onTouchEnd() {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
    touchStartX = null
    touchStartY = null
  }

  function onTouchMove(e) {
    if (pressTimer && touchStartX !== null && touchStartY !== null) {
      const touch = e.touches[0]
      const dx = Math.abs(touch.clientX - touchStartX)
      const dy = Math.abs(touch.clientY - touchStartY)
      if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(pressTimer)
        pressTimer = null
        touchStartX = null
        touchStartY = null
      }
    }
  }

  function onMouseOver(e) {
    const verseEl = e.target.closest('[data-verse]')
    if (!verseEl) return
    if (verseEl.querySelector('.qa-mark-hover-icon')) return

    const icon = document.createElement('button')
    icon.className = 'qa-mark-hover-icon'
    icon.setAttribute('aria-label', 'Mark this verse')
    icon.appendChild(createBookmarkIcon())
    icon.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const vKey = getVerseKey(verseEl)
      if (vKey) openEditor(vKey)
    })
    verseEl.insertBefore(icon, verseEl.firstChild)
  }

  function onMouseOut(e) {
    const verseEl = e.target.closest('[data-verse]')
    if (verseEl) {
      const icon = verseEl.querySelector('.qa-mark-hover-icon')
      if (icon) icon.remove()
    }
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchend', onTouchEnd)
  container.addEventListener('touchmove', onTouchMove)
  container.addEventListener('mouseover', onMouseOver)
  container.addEventListener('mouseout', onMouseOut)

  return () => {
    if (unsubNavNavigate) {
      unsubNavNavigate()
      unsubNavNavigate = null
    }
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchend', onTouchEnd)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('mouseover', onMouseOver)
    container.removeEventListener('mouseout', onMouseOut)
  }
}
