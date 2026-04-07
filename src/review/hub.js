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
import { showUndoToast, clearUndoToast } from '../core/ui.js'

const PAGE_SIZE = 30

let currentState = null
let allMarks = []
let filteredMarks = []
let displayedCount = 0
let currentUndoRecord = null
let surahs = []

/**
 * Initialize the Review Hub.
 */
export async function init() {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

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
  setInitialFocus()

  emit('review:open')
}

/**
 * Clean up hub state.
 */
export function cleanup() {
  clearUndoToast()
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = null
  }
  const mainContent = document.getElementById('main-content')
  if (mainContent) {
    mainContent.textContent = ''
  }
  currentState = null
  allMarks = []
  filteredMarks = []
  displayedCount = 0
}

/**
 * Apply a filter and re-render with debouncing.
 * @param {{ activeTag?: string|null, surahFilter?: number|null }} filter
 */
export async function applyFilter(filter) {
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
  }
  
  filterDebounceTimer = setTimeout(async () => {
    if (filter.activeTag !== undefined) {
      currentState.activeTag = filter.activeTag
    }
    if (filter.surahFilter !== undefined) {
      currentState.surahFilter = filter.surahFilter
    }
    await saveState(currentState)
    emit('review:filter', { tags: currentState.activeTag, surah: currentState.surahFilter })

    await reloadMarks()
    displayedCount = 0
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      render(mainContent)
    }
    
    filterDebounceTimer = null
  }, FILTER_DEBOUNCE_MS)
}

/**
 * Reload marks from IDB.
 */
async function reloadMarks() {
  allMarks = await getAll()
}

let filterDebounceTimer = null
const FILTER_DEBOUNCE_MS = 50

/**
 * Prepare marks by applying filters and sorting.
 * Pure function - returns new array without mutating inputs.
 * @returns {Array} filtered and sorted marks
 */
function prepareMarks(marks, state) {
  let result = [...marks]
  
  if (state.activeTag) {
    result = result.filter(m => m.tags.includes(state.activeTag))
  }
  if (state.surahFilter) {
    const surahPrefix = `${state.surahFilter}:`
    result = result.filter(m => m.verseKey.startsWith(surahPrefix))
  }
  
  const sortKey = state.sortBy || 'updatedAt'
  result.sort((a, b) => b[sortKey] - a[sortKey])
  
  return result
}

/**
 * Render the hub view.
 */
function render(container) {
  container.textContent = ''

  // Prepare marks (pure function, no side effects)
  filteredMarks = prepareMarks(allMarks, currentState)

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

/**
 * Set initial focus for accessibility.
 */
function setInitialFocus() {
  const firstFocusable = document.querySelector('.qa-review-controls button')
  if (firstFocusable) {
    firstFocusable.focus()
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
  // Show what will happen when clicked (not current state)
  sortToggle.textContent = currentState.sortBy === 'updatedAt' ? 'Sort: Created' : 'Sort: Updated'
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
    if (!groups.has(surahNum)) {
      groups.set(surahNum, [])
    }
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
    if (e.target.closest('button')) {
      return
    }
    openEditor(mark.verseKey)
  })

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'qa-review-delete-btn'
  deleteBtn.setAttribute('data-action', 'delete-mark')
  deleteBtn.textContent = 'Delete'
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation()
    currentUndoRecord = mark
    await deleteMark(mark.verseKey)
    card.remove()
    showUndoToast({
      verseKey: mark.verseKey,
      record: currentUndoRecord,
      onUndo: async (record) => {
        await saveMark(record.verseKey, record.tags)
      },
      onComplete: async () => {
        currentUndoRecord = null
        await reloadMarks()
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
          render(mainContent)
        }
      }
    })
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
