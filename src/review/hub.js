/**
 * Review hub: All Marks view.
 * Surah-grouped and flat views, tag/surah filtering, sort, pagination.
 */

import { getAll, del as deleteMark, save as saveMark } from '../marks/store.js'
import { getColorForTag } from '../marks/tags.js'
import { getSurahs } from '../data/dataset.js'
import { emit } from '../core/events.js'
import { save as saveState, load as loadState, getDefaultState } from './state.js'
import { openEditor } from '../marks/editor.js'
import { UI } from '../core/constants.js'

const PAGE_SIZE = 30
const UNDO_TIMEOUT_MS = UI.UNDO_TIMEOUT_MS

let currentState = null
let allMarks = []
let filteredMarks = []
let displayedCount = 0
let undoTimer = null
let undoRecord = null
let surahs = []

/**
 * Initialize the Review Hub.
 */
export async function init() {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) return

  try {
    surahs = await getSurahs()
  } catch (error) {
    console.error('Failed to load surahs for Review Hub:', error)
    surahs = []
  }

  const saved = await loadState()
  currentState = saved || getDefaultState()

  await reloadMarks()
  render(mainContent)

  emit('review:open')
}

/**
 * Clean up hub state.
 */
export function cleanup() {
  clearUndoToast()
  const mainContent = document.getElementById('main-content')
  if (mainContent) mainContent.textContent = ''
  currentState = null
  allMarks = []
  filteredMarks = []
  displayedCount = 0
}

/**
 * Apply a filter and re-render.
 * @param {{ activeTag?: string|null, surahFilter?: number|null }} filter
 */
export async function applyFilter(filter) {
  if (filter.activeTag !== undefined) currentState.activeTag = filter.activeTag
  if (filter.surahFilter !== undefined) currentState.surahFilter = filter.surahFilter
  await saveState(currentState)
  emit('review:filter', { tags: currentState.activeTag, surah: currentState.surahFilter })

  await reloadMarks()
  displayedCount = 0
  const mainContent = document.getElementById('main-content')
  if (mainContent) render(mainContent)
}

/**
 * Reload marks from IDB.
 */
async function reloadMarks() {
  allMarks = await getAll()
}

/**
 * Render the hub view.
 */
function render(container) {
  container.textContent = ''

  // Apply filters
  filteredMarks = [...allMarks]
  if (currentState.activeTag) {
    filteredMarks = filteredMarks.filter(m => m.tags.includes(currentState.activeTag))
  }
  if (currentState.surahFilter) {
    const surahPrefix = `${currentState.surahFilter}:`
    filteredMarks = filteredMarks.filter(m => m.verseKey.startsWith(surahPrefix))
  }

  // Sort
  const sortKey = currentState.sortBy || 'updatedAt'
  filteredMarks.sort((a, b) => b[sortKey] - a[sortKey])

  if (filteredMarks.length === 0 && allMarks.length === 0) {
    renderEmptyState(container)
    return
  }

  if (filteredMarks.length === 0) {
    renderNoResults(container)
    return
  }

  renderControls(container)

  const pageMarks = filteredMarks.slice(0, PAGE_SIZE)
  displayedCount = pageMarks.length

  if (currentState.groupBy === 'surah') {
    renderGrouped(container, pageMarks)
  } else {
    renderFlat(container, pageMarks)
  }

  if (displayedCount < filteredMarks.length) {
    renderLoadMore(container)
  }
}

function renderControls(container) {
  const controls = document.createElement('div')
  controls.className = 'qa-review-controls'

  const groupToggle = document.createElement('button')
  groupToggle.className = 'qa-review-group-toggle'
  groupToggle.textContent = currentState.groupBy === 'surah' ? 'Flat view' : 'Surah view'
  groupToggle.addEventListener('click', async () => {
    currentState.groupBy = currentState.groupBy === 'surah' ? 'flat' : 'surah'
    await saveState(currentState)
    render(container)
  })
  controls.appendChild(groupToggle)

  const sortToggle = document.createElement('button')
  sortToggle.className = 'qa-review-sort-toggle'
  sortToggle.textContent = currentState.sortBy === 'updatedAt' ? 'Sort: Updated' : 'Sort: Created'
  sortToggle.addEventListener('click', async () => {
    currentState.sortBy = currentState.sortBy === 'updatedAt' ? 'createdAt' : 'updatedAt'
    await saveState(currentState)
    render(container)
  })
  controls.appendChild(sortToggle)

  container.appendChild(controls)
}

function renderGrouped(container, marks) {
  const groups = new Map()
  for (const mark of marks) {
    const surahNum = parseInt(mark.verseKey.split(':')[0], 10)
    if (!groups.has(surahNum)) groups.set(surahNum, [])
    groups.get(surahNum).push(mark)
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => a - b)
  for (const surahNum of sortedKeys) {
    const header = document.createElement('div')
    header.className = 'qa-review-surah-header'
    header.setAttribute('data-surah-group', String(surahNum))
    const meta = surahs.find(s => s.n === surahNum)
    header.textContent = meta ? `${meta.name} (${meta.n})` : `Surah ${surahNum}`
    container.appendChild(header)

    for (const mark of groups.get(surahNum)) {
      container.appendChild(renderMarkCard(mark))
    }
  }
}

function renderFlat(container, marks) {
  for (const mark of marks) {
    container.appendChild(renderMarkCard(mark))
  }
}

function renderMarkCard(mark) {
  const card = document.createElement('div')
  card.className = 'qa-review-mark'
  card.setAttribute('data-mark', mark.verseKey)

  const verseLabel = document.createElement('span')
  verseLabel.className = 'qa-review-verse-label'
  verseLabel.textContent = mark.verseKey

  const tagDots = document.createElement('span')
  tagDots.className = 'qa-review-tag-dots'
  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    dot.title = tag
    tagDots.appendChild(dot)
  }

  const actions = document.createElement('div')
  actions.className = 'qa-review-mark-actions'

  card.addEventListener('click', (e) => {
    if (e.target.closest('button')) return
    openEditor(mark.verseKey)
  })

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'qa-review-delete-btn'
  deleteBtn.setAttribute('data-action', 'delete-mark')
  deleteBtn.textContent = 'Delete'
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation()
    undoRecord = mark
    await deleteMark(mark.verseKey)
    card.remove()
    showUndoToast(mark.verseKey)
  })
  actions.appendChild(deleteBtn)

  card.appendChild(verseLabel)
  card.appendChild(tagDots)
  card.appendChild(actions)
  return card
}

function renderEmptyState(container) {
  const empty = document.createElement('div')
  empty.className = 'qa-review-empty'
  empty.textContent = 'No marks yet. Start reading and mark verses to see them here.'
  container.appendChild(empty)
}

function renderNoResults(container) {
  const noResults = document.createElement('div')
  noResults.className = 'qa-review-no-results'
  noResults.textContent = 'No marks match your filters.'

  const clearBtn = document.createElement('button')
  clearBtn.className = 'qa-review-clear-filter'
  clearBtn.textContent = 'Clear filter'
  clearBtn.addEventListener('click', () => {
    applyFilter({ activeTag: null, surahFilter: null })
  })

  noResults.appendChild(document.createElement('br'))
  noResults.appendChild(clearBtn)
  container.appendChild(noResults)
}

function renderLoadMore(container) {
  const btn = document.createElement('button')
  btn.className = 'qa-review-load-more'
  btn.setAttribute('data-action', 'load-more')
  btn.textContent = 'Load more'
  btn.addEventListener('click', () => {
    btn.remove()
    const nextPage = filteredMarks.slice(displayedCount, displayedCount + PAGE_SIZE)
    displayedCount += nextPage.length

    if (currentState.groupBy === 'surah') {
      renderGrouped(container, nextPage)
    } else {
      renderFlat(container, nextPage)
    }

    if (displayedCount < filteredMarks.length) {
      renderLoadMore(container)
    }
  })
  container.appendChild(btn)
}

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
      await saveMark(undoRecord.verseKey, undoRecord.tags)
      emit('marks:undo', { verseKey: undoRecord.verseKey })
      undoRecord = null
    }
    clearUndoToast()
    await reloadMarks()
    const mainContent = document.getElementById('main-content')
    if (mainContent) render(mainContent)
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

function clearUndoToast() {
  if (undoTimer) {
    clearTimeout(undoTimer)
    undoTimer = null
  }
  const toast = document.querySelector('.qa-undo-toast')
  if (toast) toast.remove()
}
