/**
 * Mark editor modal.
 * Opens on long-press (touch) or hover-icon click (mouse).
 * Chip-based tag selection with search/create input.
 *
 * Mobile (< 640px): bottom sheet.
 * Tablet (640–1024px): centered modal, max-width 480px.
 * Desktop (> 1024px): centered dialog, max-width 400px.
 */

import { save, del, getByVerseKey, getAll } from './store.js'
import { getSeedTags, getAllUsedTags, getColorForTag } from './tags.js'
import { validateTagLabel } from '../safety/input-validator.js'
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { showUndoToast, clearUndoToast } from '../core/ui.js'

const LONG_PRESS_MS = 500

let activeModal = null
let currentUndoRecord = null
let currentEditingVerseKey = null
let _historyPushed = false
let _popstateHandler = null

on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => {
  if (currentEditingVerseKey && verseKeys.includes(currentEditingVerseKey)) {
    closeEditor()
  }
})

/**
 * Open the mark editor modal for a verse.
 * @param {string} verseKey - e.g. '2:255'
 */
export async function openEditor(verseKey) {
  clearUndoToast()
  closeEditor()

  const existing = await getByVerseKey(verseKey)
  const currentTags = existing ? existing.tags : []

  // Determine which tags to show as chips
  const allMarks = await getAll()
  const hasSomeMarks = allMarks.length > 0
  let availableTags
  if (hasSomeMarks) {
    availableTags = await getAllUsedTags()
  } else {
    availableTags = getSeedTags().map(s => s.label)
  }

  // Track selected tags
  const selectedTags = new Set(currentTags)

  // --- Backdrop ---
  const backdrop = document.createElement('div')
  backdrop.className = 'qa-mark-backdrop'
  backdrop.addEventListener('click', closeEditor)

  // --- Modal ---
  const modal = document.createElement('div')
  modal.className = 'qa-mark-modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', `Mark verse ${verseKey}`)

  // Title
  const title = document.createElement('h2')
  title.className = 'qa-mark-title'
  title.textContent = `Mark ${verseKey}`
  modal.appendChild(title)

  // Hint (only when zero marks)
  if (!hasSomeMarks) {
    const hint = document.createElement('p')
    hint.className = 'qa-mark-hint'
    hint.textContent = 'Tags help you organise verses — pick one or create your own.'
    modal.appendChild(hint)
  }

  // Search input
  const searchWrap = document.createElement('div')
  searchWrap.className = 'qa-tag-search-wrap'
  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.className = 'qa-tag-search'
  searchInput.placeholder = 'Search or create tag...'
  searchInput.setAttribute('autocomplete', 'off')
  searchWrap.appendChild(searchInput)
  modal.appendChild(searchWrap)

  // Chip container
  const chipContainer = document.createElement('div')
  chipContainer.className = 'qa-tag-chips'
  modal.appendChild(chipContainer)

  // Render chips
  function renderChips(filterText) {
    chipContainer.textContent = ''
    const lower = (filterText || '').trim().toLowerCase()

    // Remove the create button if it exists (we'll re-add below if needed)
    const oldCreate = modal.querySelector('.qa-tag-create-btn')
    if (oldCreate) oldCreate.remove()

    let hasExactMatch = false
    const allTags = [...availableTags]

    for (const tag of allTags) {
      if (lower && !tag.includes(lower)) {
        continue
      }
      if (tag === lower) hasExactMatch = true

      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'qa-tag-chip'
      chip.dataset.tag = tag
      chip.setAttribute('aria-pressed', selectedTags.has(tag) ? 'true' : 'false')

      const dot = document.createElement('span')
      dot.className = 'qa-tag-chip-dot'
      dot.style.backgroundColor = getColorForTag(tag)
      chip.appendChild(dot)

      chip.appendChild(document.createTextNode(tag))

      chip.addEventListener('click', () => {
        const pressed = chip.getAttribute('aria-pressed') === 'true'
        if (pressed) {
          selectedTags.delete(tag)
          chip.setAttribute('aria-pressed', 'false')
        } else {
          selectedTags.add(tag)
          chip.setAttribute('aria-pressed', 'true')
        }
        updateSaveButton()
      })

      chipContainer.appendChild(chip)
    }

    // "Create" button — only when filter text is non-empty, passes validation, and has no exact match
    if (lower && !hasExactMatch) {
      const validation = validateTagLabel(lower)
      if (validation.valid) {
        const createBtn = document.createElement('button')
        createBtn.type = 'button'
        createBtn.className = 'qa-tag-create-btn'
        createBtn.textContent = `Create "${validation.label}"`
        createBtn.addEventListener('click', () => {
          const label = validation.label
          if (!availableTags.includes(label)) {
            availableTags.push(label)
          }
          selectedTags.add(label)
          searchInput.value = ''
          renderChips('')
          updateSaveButton()
        })
        // Insert after chip container
        chipContainer.after(createBtn)
      }
    }
  }

  renderChips('')

  // Search input handler
  searchInput.addEventListener('input', () => {
    renderChips(searchInput.value)
  })

  // --- Actions ---
  const actions = document.createElement('div')
  actions.className = 'qa-mark-actions'

  const saveBtn = document.createElement('button')
  saveBtn.className = 'qa-mark-save-btn'
  saveBtn.setAttribute('data-action', 'save')
  saveBtn.textContent = 'Save'
  saveBtn.disabled = selectedTags.size === 0
  saveBtn.addEventListener('click', async () => {
    if (selectedTags.size === 0) return
    await save(verseKey, [...selectedTags])
    closeEditor()
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'qa-mark-cancel-btn'
  cancelBtn.setAttribute('data-action', 'cancel')
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', closeEditor)

  function updateSaveButton() {
    saveBtn.disabled = selectedTags.size === 0
  }

  actions.appendChild(saveBtn)
  actions.appendChild(cancelBtn)

  if (existing) {
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'qa-mark-delete-btn'
    deleteBtn.setAttribute('data-action', 'delete')
    deleteBtn.textContent = 'Delete'
    deleteBtn.addEventListener('click', async () => {
      currentUndoRecord = existing
      await del(verseKey)
      closeEditor()
      showUndoToast({
        verseKey,
        record: currentUndoRecord,
        onUndo: async (record) => {
          await save(record.verseKey, record.tags)
        },
        onComplete: () => {
          currentUndoRecord = null
        }
      })
    })
    actions.appendChild(deleteBtn)
  }

  modal.appendChild(actions)

  // --- Mount ---
  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(backdrop)
  shell.appendChild(modal)
  activeModal = { backdrop, modal }
  currentEditingVerseKey = verseKey

  // Focus trap
  function getFocusableElements() {
    return modal.querySelectorAll(
      'input, button:not([disabled])'
    )
  }

  // Auto-focus input on desktop only
  const isDesktop = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 640px)').matches
    : false
  if (isDesktop) {
    searchInput.focus()
  } else {
    // Focus first chip on mobile so keyboard stays hidden
    const firstChip = chipContainer.querySelector('.qa-tag-chip')
    if (firstChip) firstChip.focus()
  }

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditor()
      return
    }
    if (e.key !== 'Tab') return

    const focusable = getFocusableElements()
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  })

  // History entry for browser back
  _popstateHandler = () => {
    if (activeModal) closeEditor()
  }
  window.addEventListener('popstate', _popstateHandler)
  history.pushState({ modal: 'mark-editor' }, '')
  _historyPushed = true
}

/**
 * Close the active editor modal.
 */
export function closeEditor() {
  if (!activeModal) {
    return
  }

  activeModal.backdrop.remove()
  activeModal.modal.remove()
  activeModal = null
  currentEditingVerseKey = null

  // Remove popstate listener before calling history.back() to avoid re-entry
  if (_popstateHandler) {
    window.removeEventListener('popstate', _popstateHandler)
    _popstateHandler = null
  }

  if (_historyPushed) {
    _historyPushed = false
    history.back() // Return to the pre-modal history entry
  }
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

  function getVerseKey(element) {
    const verseEl = element.closest('[data-verse]')
    if (!verseEl) {
      return null
    }
    const verseNum = verseEl.getAttribute('data-verse')
    const match = location.hash.match(/#\/s\/(\d+)/)
    const surahNum = match ? match[1] : null
    if (!surahNum || !verseNum) {
      return null
    }
    return `${surahNum}:${verseNum}`
  }

  function onTouchStart(e) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) {
      return
    }
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
    if (!verseEl) {
      return
    }
    
    // Ignore if moving within the same verse
    if (e.relatedTarget && verseEl.contains(e.relatedTarget)) {
      return
    }

    if (verseEl.querySelector('.qa-mark-hover-icon')) {
      return
    }

    const icon = document.createElement('button')
    icon.className = 'qa-mark-hover-icon'
    icon.setAttribute('aria-label', 'Mark this verse')
    icon.appendChild(createBookmarkIcon())
    icon.addEventListener('click', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const vKey = getVerseKey(verseEl)
      if (vKey) {
        openEditor(vKey)
      }
    })
    verseEl.appendChild(icon)
  }

  function onMouseOut(e) {
    const verseEl = e.target.closest('[data-verse]')
    if (!verseEl) {
      return
    }

    // Ignore if moving within the same verse
    if (e.relatedTarget && verseEl.contains(e.relatedTarget)) {
      return
    }

    const icon = verseEl.querySelector('.qa-mark-hover-icon')
    if (icon) {
      icon.remove()
    }
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchend', onTouchEnd, { passive: true })
  container.addEventListener('touchmove', onTouchMove, { passive: true })
  container.addEventListener('mouseover', onMouseOver)
  container.addEventListener('mouseout', onMouseOut)

  return () => {
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchend', onTouchEnd)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('mouseover', onMouseOver)
    container.removeEventListener('mouseout', onMouseOut)
  }
}
