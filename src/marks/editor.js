/**
 * Mark editor bottom sheet.
 * - Verse-preview header (shared verse-block grammar)
 * - Note textarea
 * - Pinned Selected strip with count badge, Clear all, × on each chip
 * - Unselected "All tags" region, dim when 7+ selected
 * - Live search count + "+ create" chip
 * - Pinned footer: Delete · Cancel · Save
 * - Delete → inline confirm → undo toast
 *
 * Long-press is the ONLY entry point (per feedback memory: verse long-press
 * opens the mark editor; no contextual menu, no multi-action sheet).
 */

import { save, del, getByVerseKey, getAll } from './store.js'
import { getSeedTags, getAllUsedTags, getColorForTag } from './tags.js'
import { getSurah, getSurahs } from '../data/dataset.js'
import { validateTagLabel } from '../safety/input-validator.js'
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { showUndoToast, clearUndoToast } from '../core/ui.js'

const LONG_PRESS_MS = 500
const DIM_THRESHOLD = 7

let activeModal = null
let currentUndoRecord = null
let currentEditingVerseKey = null
let _historyPushed = false
let _popstateHandler = null
let _escHandler = null
let _openCallId = 0

on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => {
  if (currentEditingVerseKey && verseKeys.includes(currentEditingVerseKey)) {
    closeEditor()
  }
})

export async function openEditor(verseKey) {
  clearUndoToast()
  closeEditor()

  const callId = ++_openCallId

  const [s, v] = verseKey.split(':').map(n => parseInt(n, 10))
  const [existing, allMarks, surahs] = await Promise.all([
    getByVerseKey(verseKey),
    getAll().catch(() => []),
    getSurahs().catch(() => []),
  ])

  // Another openEditor call arrived while we were awaiting IDB — bail out.
  if (callId !== _openCallId) { return }

  const selectedTags = new Set(existing?.tags || [])
  const noteValue = existing?.note || ''

  // Tag universe
  let allTags
  if (allMarks.length > 0) {
    allTags = await getAllUsedTags()
  } else {
    allTags = getSeedTags().map(st => st.label)
  }
  // Include any seed tags not yet used so the user always sees the vocabulary
  const seedLabels = getSeedTags().map(st => st.label)
  for (const sl of seedLabels) { if (!allTags.includes(sl)) { allTags.push(sl) } }

  const surahMeta = surahs.find(x => x.n === s)
  const surahName = surahMeta?.name || ''

  // Build sheet
  const scrim = document.createElement('div')
  scrim.className = 'qa-sheet-backdrop'
  scrim.addEventListener('click', closeEditor)

  const sheet = document.createElement('div')
  sheet.className = 'qa-sheet qa-sheet--bottom qa-sheet--mark'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', `Mark verse ${verseKey}`)

  const grip = document.createElement('div')
  grip.className = 'qa-sheet-grip'
  grip.setAttribute('aria-hidden', 'true')

  const hdr = document.createElement('div')
  hdr.className = 'qa-sheet-hdr qa-mark-hdr'
  const title = document.createElement('div')
  title.className = 'qa-sheet-title'
  title.textContent = existing ? 'Edit mark' : 'New mark'
  const ref = document.createElement('div')
  ref.className = 'qa-mark-ref'
  ref.textContent = `${s}\u00A0:\u00A0${v}`
  hdr.appendChild(title)
  hdr.appendChild(ref)

  const body = document.createElement('div')
  body.className = 'qa-sheet-body qa-mark-body'

  // Verse preview (shared grammar)
  const quote = document.createElement('div')
  quote.className = 'qa-mark-quote'
  const eyebrow = document.createElement('div')
  eyebrow.className = 'qa-mark-quote-ref'
  eyebrow.textContent = `${verseKey} \u00B7 ${surahName}`
  const arLine = document.createElement('div')
  arLine.className = 'qa-mark-quote-ar'
  arLine.setAttribute('dir', 'rtl')
  arLine.textContent = '…'
  const enLine = document.createElement('div')
  enLine.className = 'qa-mark-quote-en'
  enLine.textContent = '…'
  quote.appendChild(eyebrow)
  quote.appendChild(arLine)
  quote.appendChild(enLine)
  body.appendChild(quote)

  getSurah(s).then(data => {
    arLine.textContent = data?.ar?.[v - 1] || ''
    enLine.textContent = data?.en?.[v - 1] || ''
  }).catch(() => { /* keep ellipses */ })

  // Note textarea
  const noteLabel = document.createElement('label')
  noteLabel.className = 'qa-mark-label'
  noteLabel.textContent = 'Note (optional)'
  const note = document.createElement('textarea')
  note.className = 'qa-mark-note'
  note.rows = 2
  note.maxLength = 500
  note.value = noteValue
  note.setAttribute('placeholder', 'A thought to revisit…')
  body.appendChild(noteLabel)
  body.appendChild(note)

  // Selected strip
  const selStrip = document.createElement('div')
  selStrip.className = 'qa-mark-selected'
  const selHead = document.createElement('div')
  selHead.className = 'qa-mark-selected-head'
  const selTitle = document.createElement('span')
  selTitle.textContent = 'Selected'
  const selCount = document.createElement('span')
  selCount.className = 'qa-mark-selected-count'
  const clearAll = document.createElement('button')
  clearAll.type = 'button'
  clearAll.className = 'qa-mark-clear-all'
  clearAll.textContent = 'Clear all'
  clearAll.addEventListener('click', () => {
    selectedTags.clear()
    renderChips()
  })
  selHead.appendChild(selTitle)
  selHead.appendChild(selCount)
  selHead.appendChild(clearAll)
  const selChips = document.createElement('div')
  selChips.className = 'qa-mark-chips qa-mark-chips--selected'
  const selEmpty = document.createElement('div')
  selEmpty.className = 'qa-mark-selected-empty'
  selEmpty.textContent = 'No tags yet — pick one below or search.'
  selStrip.appendChild(selHead)
  selStrip.appendChild(selChips)
  selStrip.appendChild(selEmpty)
  body.appendChild(selStrip)

  // Tag search
  const searchWrap = document.createElement('div')
  searchWrap.className = 'qa-mark-search'
  const searchIcon = document.createElement('span')
  searchIcon.className = 'qa-mark-search-icon'
  searchIcon.setAttribute('aria-hidden', 'true')
  searchIcon.textContent = '\u2315'
  const searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.className = 'qa-mark-search-input'
  searchInput.setAttribute('placeholder', 'Search or create a tag')
  searchInput.setAttribute('aria-label', 'Search or create a tag')
  searchInput.setAttribute('autocomplete', 'off')
  searchInput.maxLength = 40
  const searchCount = document.createElement('span')
  searchCount.className = 'qa-mark-search-count'
  searchWrap.appendChild(searchIcon)
  searchWrap.appendChild(searchInput)
  searchWrap.appendChild(searchCount)
  body.appendChild(searchWrap)

  // All tags region
  const allHead = document.createElement('div')
  allHead.className = 'qa-mark-all-head'
  const allLabel = document.createElement('span')
  allLabel.className = 'qa-mark-all-label'
  allLabel.textContent = 'All tags'
  const allCount = document.createElement('span')
  allCount.className = 'qa-mark-all-count'
  allHead.appendChild(allLabel)
  allHead.appendChild(allCount)
  const allChips = document.createElement('div')
  allChips.className = 'qa-mark-chips qa-mark-chips--all'
  body.appendChild(allHead)
  body.appendChild(allChips)

  // Footer
  const footer = document.createElement('div')
  footer.className = 'qa-sheet-footer qa-mark-footer'
  const delBtn = document.createElement('button')
  delBtn.type = 'button'
  delBtn.className = 'qa-mark-btn qa-mark-btn--danger'
  delBtn.textContent = '\u232B Delete'
  delBtn.setAttribute('data-action', 'delete')
  const spacer = document.createElement('div')
  spacer.className = 'qa-mark-footer-spacer'
  const cancelBtn = document.createElement('button')
  cancelBtn.type = 'button'
  cancelBtn.className = 'qa-mark-btn qa-mark-btn--ghost'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.setAttribute('data-action', 'cancel')
  cancelBtn.addEventListener('click', closeEditor)
  const saveBtn = document.createElement('button')
  saveBtn.type = 'button'
  saveBtn.className = 'qa-mark-btn qa-mark-btn--primary'
  saveBtn.textContent = 'Save'
  saveBtn.setAttribute('data-action', 'save')

  if (!existing) {
    // New mark — hide delete
    delBtn.classList.add('qa-mark-btn--hidden')
  }
  footer.appendChild(delBtn)
  footer.appendChild(spacer)
  footer.appendChild(cancelBtn)
  footer.appendChild(saveBtn)

  sheet.appendChild(grip)
  sheet.appendChild(hdr)
  sheet.appendChild(body)
  sheet.appendChild(footer)

  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(scrim)
  shell.appendChild(sheet)

  activeModal = { backdrop: scrim, modal: sheet }
  currentEditingVerseKey = verseKey

  // History entry for browser back
  _popstateHandler = () => { if (activeModal) { closeEditor() } }
  window.addEventListener('popstate', _popstateHandler)
  history.pushState({ modal: 'mark-editor' }, '')
  _historyPushed = true

  // Focus management
  const isDesktop = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 640px)').matches
    : false
  if (isDesktop) { searchInput.focus() }

  function renderChips() {
    // Selected strip
    while (selChips.firstChild) { selChips.removeChild(selChips.firstChild) }
    const selArr = [...selectedTags]
    selCount.textContent = String(selArr.length)
    if (selArr.length === 0) {
      selEmpty.style.display = ''
      clearAll.style.display = 'none'
    } else {
      selEmpty.style.display = 'none'
      clearAll.style.display = ''
      for (const tag of selArr) {
        selChips.appendChild(makeChip(tag, { selected: true, onToggle: () => { selectedTags.delete(tag); renderChips() } }))
      }
    }

    // All tags (unselected only), filtered by search
    const q = (searchInput.value || '').trim().toLowerCase()
    while (allChips.firstChild) { allChips.removeChild(allChips.firstChild) }
    const unselected = allTags.filter(t => !selectedTags.has(t))
    const filtered = q ? unselected.filter(t => t.toLowerCase().includes(q)) : unselected
    const dim = selArr.length >= DIM_THRESHOLD
    allCount.textContent = filtered.length === 1 ? '1 unselected' : `${filtered.length} unselected`
    if (q) {
      searchCount.textContent = filtered.length === 1 ? '1 match' : `${filtered.length} matches`
    } else {
      searchCount.textContent = `${allTags.length} tags`
    }

    for (const tag of filtered) {
      const chip = makeChip(tag, {
        selected: false,
        dim,
        onToggle: () => { selectedTags.add(tag); renderChips() },
      })
      allChips.appendChild(chip)
    }

    // Create chip — only when search term has no exact match
    if (q && !allTags.some(t => t.toLowerCase() === q)) {
      const validation = validateTagLabel(q)
      if (validation.valid) {
        const create = document.createElement('button')
        create.type = 'button'
        create.className = 'qa-mark-chip qa-mark-chip--create'
        create.textContent = `+ create "${validation.label}"`
        create.addEventListener('click', () => {
          const lbl = validation.label
          if (!allTags.includes(lbl)) { allTags.push(lbl) }
          selectedTags.add(lbl)
          searchInput.value = ''
          renderChips()
        })
        allChips.appendChild(create)
      }
    }

    saveBtn.disabled = selectedTags.size === 0 && !note.value.trim()
  }

  function makeChip(tag, { selected, dim, onToggle }) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'qa-mark-chip'
    if (selected) { chip.classList.add('qa-mark-chip--on') }
    if (dim) { chip.classList.add('qa-mark-chip--dim') }
    const dot = document.createElement('span')
    dot.className = 'qa-mark-chip-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    chip.appendChild(dot)
    chip.appendChild(document.createTextNode(tag))
    if (selected) {
      const x = document.createElement('span')
      x.className = 'qa-mark-chip-x'
      x.textContent = '\u00D7'
      x.setAttribute('aria-hidden', 'true')
      chip.appendChild(x)
    }
    chip.addEventListener('click', onToggle)
    return chip
  }

  searchInput.addEventListener('input', renderChips)
  note.addEventListener('input', () => { saveBtn.disabled = selectedTags.size === 0 && !note.value.trim() })

  saveBtn.addEventListener('click', async () => {
    if (selectedTags.size === 0 && !note.value.trim()) { return }
    await save(verseKey, [...selectedTags], note.value.trim())
    closeEditor()
  })

  delBtn.addEventListener('click', async () => {
    // Inline confirm: replace footer contents with confirm/cancel
    while (footer.firstChild) { footer.removeChild(footer.firstChild) }
    const warn = document.createElement('div')
    warn.className = 'qa-mark-confirm-text'
    warn.textContent = 'Delete this mark?'
    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'qa-mark-btn qa-mark-btn--ghost'
    back.textContent = 'Keep'
    back.addEventListener('click', () => { renderFooter() })
    const go = document.createElement('button')
    go.type = 'button'
    go.className = 'qa-mark-btn qa-mark-btn--danger-primary'
    go.textContent = 'Delete'
    go.addEventListener('click', async () => {
      currentUndoRecord = existing
      await del(verseKey)
      closeEditor()
      showUndoToast({
        verseKey,
        record: currentUndoRecord,
        onUndo: async (record) => { await save(record.verseKey, record.tags, record.note || '') },
        onComplete: () => { currentUndoRecord = null },
      })
    })
    footer.appendChild(warn)
    footer.appendChild(back)
    footer.appendChild(go)
  })

  function renderFooter() {
    while (footer.firstChild) { footer.removeChild(footer.firstChild) }
    footer.appendChild(delBtn)
    footer.appendChild(spacer)
    footer.appendChild(cancelBtn)
    footer.appendChild(saveBtn)
  }

  // Esc closes — listen on document so the handler fires regardless of which
  // element has focus (touch devices may leave no element focused after a gesture).
  _escHandler = (e) => { if (e.key === 'Escape') { closeEditor() } }
  document.addEventListener('keydown', _escHandler)

  renderChips()
}

export function closeEditor() {
  if (!activeModal) { return }

  activeModal.backdrop.remove()
  activeModal.modal.remove()
  activeModal = null
  currentEditingVerseKey = null

  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler)
    _escHandler = null
  }
  if (_popstateHandler) {
    window.removeEventListener('popstate', _popstateHandler)
    _popstateHandler = null
  }
  if (_historyPushed) {
    _historyPushed = false
    history.back()
  }
}

/**
 * Long-press detection on a container.
 */
export function setupLongPress(container) {
  let pressTimer = null
  let touchStartY = null
  let touchStartX = null
  const TOUCH_MOVE_THRESHOLD = 10

  function getVerseKey(element) {
    const verseEl = element.closest('[data-verse]')
    if (!verseEl) { return null }
    const verseNum = verseEl.getAttribute('data-verse')
    const match = location.hash.match(/#\/s\/(\d+)/)
    const surahNum = match ? match[1] : null
    if (!surahNum || !verseNum) { return null }
    return `${surahNum}:${verseNum}`
  }

  function onTouchStart(e) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) { return }
    const touch = e.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    pressTimer = setTimeout(() => {
      openEditor(verseKey)
      pressTimer = null
    }, LONG_PRESS_MS)
  }

  function onTouchEnd() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
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

  // Desktop: right-click opens editor directly
  // (per feedback memory: long-press = mark editor only; no context menu)
  function onContextMenu(e) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) { return }
    e.preventDefault()
    openEditor(verseKey)
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchend', onTouchEnd, { passive: true })
  container.addEventListener('touchmove', onTouchMove, { passive: true })
  container.addEventListener('contextmenu', onContextMenu)

  return () => {
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchend', onTouchEnd)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('contextmenu', onContextMenu)
  }
}
