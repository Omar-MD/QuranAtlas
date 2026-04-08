/**
 * Review hub: All Marks view.
 * Surah-grouped and flat views, tag/surah filtering, sort, pagination.
 */

import { getAll, getByTag, del as deleteMark, save as saveMark } from '../marks/store.js'
import { getSurahs, getSurah } from '../data/dataset.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { put } from '../core/db.js'
import { save as saveState, load as loadState, getDefaultState } from './state.js'
import { openEditor } from '../marks/editor.js'
import { showUndoToast, clearUndoToast } from '../core/ui.js'
import { validateTagParam } from '../safety/input-validator.js'
import { announce } from '../a11y/announcer.js'

const PAGE_SIZE = 30

let currentState = null
let allMarks = []
let sortedMarks = []  // Pre-sorted cache; rebuilt on load or sort change
let filteredMarks = []
let displayedCount = 0
let currentUndoRecord = null
let surahs = []

/**
 * Initialize the Review Hub.
 */
export async function init(params = {}) {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

  // Tag deep link: #/t/:tag -> render FVR directly
  if (params.tag !== undefined) {
    await initTagDeepLink(params.tag, mainContent)
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

  emit(Events.REVIEW_OPEN)

  on(Events.SYNC_UPDATE_RECEIVED, async () => {
    await reloadMarks()
    const mc = document.getElementById('main-content')
    if (mc) {
      render(mc)
    }
  })

  on(Events.DB_VISIBILITY_VISIBLE, async () => {
    await reloadMarks()
    const mc = document.getElementById('main-content')
    if (mc) {
      render(mc)
    }
  })
}

/**
 * Handle tag deep link entry.
 * Validates tag, queries marks, renders FVR or not-found state.
 * @param {string} rawTag - URL-decoded tag parameter
 * @param {HTMLElement} container
 */
async function initTagDeepLink(rawTag, container) {
  const validation = validateTagParam(rawTag)

  if (!validation.valid) {
    renderTagNotFound(container, rawTag)
    return
  }

  const tag = validation.label
  const marks = await getByTag(tag)

  if (marks.length === 0) {
    renderTagNotFound(container, rawTag)
    return
  }

  const reviewState = {
    view: 'fvr',
    activeTag: tag,
    surahFilter: null,
    sortBy: 'updatedAt',
    groupBy: 'surah',
  }
  await saveState(reviewState)
  await put('settings', { key: 'lastSurface', value: `#/t/${encodeURIComponent(tag)}` })

  try {
    surahs = await getSurahs()
  } catch (error) {
    console.error('Failed to load surahs for tag deep link:', error)
    surahs = []
  }

  currentState = reviewState
  allMarks = marks
  sortedMarks = sortMarks(marks, currentState.sortBy)
  filteredMarks = filterMarks(sortedMarks, currentState)
  displayedCount = 0

  render(container)
  setInitialFocus()
  emit(Events.REVIEW_OPEN)
}

/**
 * Render tag not-found state.
 * @param {HTMLElement} container
 * @param {string} rawTag - original tag from URL
 */
function renderTagNotFound(container, rawTag) {
  container.textContent = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'qa-review-tag-not-found'

  const heading = document.createElement('h2')
  heading.textContent = 'Tag not found'
  wrapper.appendChild(heading)

  const message = document.createElement('p')
  const tagName = String(rawTag || '').slice(0, 50)
  message.textContent = `No marks found for "${tagName}".`
  wrapper.appendChild(message)

  const link = document.createElement('a')
  link.href = '#/review'
  link.className = 'qa-review-hub-link'
  link.textContent = 'Go to Review Hub'
  wrapper.appendChild(link)

  container.appendChild(wrapper)

  announce(`No marks found for "${tagName}". Visit Review Hub to browse your marks.`)
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
  sortedMarks = []
  filteredMarks = []
  displayedCount = 0
}

/**
 * Apply a filter and re-render with debouncing.
 * Does NOT reload from IDB — just re-filters the pre-sorted cache (O(n)).
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
    emit(Events.REVIEW_FILTER, { tags: currentState.activeTag, surah: currentState.surahFilter })

    displayedCount = 0
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      render(mainContent)
    }
    
    filterDebounceTimer = null
  }, FILTER_DEBOUNCE_MS)
}

/**
 * Reload marks from IDB and rebuild the sorted cache.
 */
async function reloadMarks() {
  allMarks = await getAll()
  sortedMarks = sortMarks(allMarks, currentState?.sortBy)
}

let filterDebounceTimer = null
const FILTER_DEBOUNCE_MS = 50

/**
 * Sort marks by a given key. Pure function — returns a new array.
 * O(n log n) — called only on load or sort-key change.
 * @param {Array} marks
 * @param {string} [sortKey='updatedAt']
 * @returns {Array}
 */
function sortMarks(marks, sortKey = 'updatedAt') {
  return [...marks].sort((a, b) => b[sortKey] - a[sortKey])
}

/**
 * Filter the pre-sorted marks by active tag and surah.
 * Pure function — O(n), no sort.
 * @param {Array} sorted - already-sorted marks array
 * @param {{ activeTag?: string|null, surahFilter?: number|null }} state
 * @returns {Array}
 */
function filterMarks(sorted, state) {
  let result = sorted
  if (state.activeTag) {
    result = result.filter(m => m.tags.includes(state.activeTag))
  }
  if (state.surahFilter) {
    const surahPrefix = `${state.surahFilter}:`
    result = result.filter(m => m.verseKey.startsWith(surahPrefix))
  }
  return result
}

/**
 * Render the hub view.
 */
function render(container) {
  container.textContent = ''

  // Filter from pre-sorted cache — O(n) with no sort overhead
  filteredMarks = filterMarks(sortedMarks, currentState)

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

  // Render synchronously first
  if (currentState.groupBy === 'surah') {
    renderGrouped(container, pageMarks)
  } else {
    renderFlat(container, pageMarks)
  }

  // Try to load content - this won't block render
  loadVerseContentBackground(pageMarks).catch(() => {
    // Silently fail - content just won't show
  })

  if (displayedCount < filteredMarks.length) {
    renderLoadMore(container)
  }
}

/**
 * Load verse content in background without blocking render.
 */
async function loadVerseContentBackground(marks) {
  const neededSurahs = new Set()
  for (const mark of marks) {
    neededSurahs.add(parseInt(mark.verseKey.split(':')[0], 10))
  }
  
  const surahDataMap = new Map()
  await Promise.all([...neededSurahs].map(async num => {
    try {
      const data = await getSurah(num)
      surahDataMap.set(num, data)
    } catch {
      // Silently fail - content won't show
    }
  }))

  // Update cards with content
  for (const mark of marks) {
    const surahNum = parseInt(mark.verseKey.split(':')[0], 10)
    const surahData = surahDataMap.get(surahNum)
    if (!surahData) {
      continue
    }
    
    const card = document.querySelector(`[data-mark="${mark.verseKey}"]`)
    if (!card) {
      continue
    }
    
    const verseNum = parseInt(mark.verseKey.split(':')[1], 10)
    const verseIdx = verseNum - 1
    const contentArea = card.querySelector('.qa-review-mark-content')
    if (!contentArea || contentArea.querySelector('.qa-review-mark-arabic')) {
      continue
    }
    
    if (surahData.ar && surahData.ar[verseIdx]) {
      const arabic = document.createElement('div')
      arabic.className = 'qa-review-mark-arabic'
      arabic.setAttribute('dir', 'rtl')
      arabic.textContent = surahData.ar[verseIdx]
      contentArea.appendChild(arabic)
    }
    if (surahData.en && surahData.en[verseIdx]) {
      const english = document.createElement('div')
      english.className = 'qa-review-mark-english'
      english.textContent = surahData.en[verseIdx]
      contentArea.appendChild(english)
    }
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
    // Reload content after render
    const pageMarks = filteredMarks.slice(0, PAGE_SIZE)
    loadVerseContentBackground(pageMarks).catch(() => {})
  })
  controls.appendChild(groupToggle)

  const sortToggle = document.createElement('button')
  sortToggle.className = 'qa-review-sort-toggle'
  // Show what will happen when clicked (not current state)
  sortToggle.textContent = currentState.sortBy === 'updatedAt' ? 'Sort: Created' : 'Sort: Updated'
  sortToggle.addEventListener('click', async () => {
    currentState.sortBy = currentState.sortBy === 'updatedAt' ? 'createdAt' : 'updatedAt'
    sortedMarks = sortMarks(allMarks, currentState.sortBy) // Rebuild sorted cache on sort change
    await saveState(currentState)
    render(container)
    // Reload content after render
    const pageMarks = filteredMarks.slice(0, PAGE_SIZE)
    loadVerseContentBackground(pageMarks).catch(() => {})
  })
  controls.appendChild(sortToggle)

  container.appendChild(controls)
}

async function renderGrouped(container, marks) {
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
      container.appendChild(renderMarkCard(mark, null))
    }
  }
}

async function renderFlat(container, marks) {
  for (const mark of marks) {
    container.appendChild(renderMarkCard(mark, null))
  }
}

function renderMarkCard(mark, surahData) {
  const card = document.createElement('div')
  card.className = 'qa-review-mark'
  card.setAttribute('data-mark', mark.verseKey)

  const header = document.createElement('div')
  header.className = 'qa-review-mark-header'

  const verseLabel = document.createElement('span')
  verseLabel.className = 'qa-review-verse-label'
  verseLabel.textContent = mark.verseKey

  const tagDots = document.createElement('span')
  tagDots.className = 'qa-review-tag-dots'
  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.dataset.tag = tag // CSS [data-tag="..."] drives color via theme.css
    dot.title = tag
    tagDots.appendChild(dot)
  }
  
  header.appendChild(verseLabel)
  header.appendChild(tagDots)

  const content = document.createElement('div')
  content.className = 'qa-review-mark-content'
  
  if (surahData) {
    const verseNum = parseInt(mark.verseKey.split(':')[1], 10)
    const verseIdx = verseNum - 1
    if (surahData.ar && surahData.ar[verseIdx]) {
      const arabic = document.createElement('div')
      arabic.className = 'qa-review-mark-arabic'
      arabic.setAttribute('dir', 'rtl')
      arabic.textContent = surahData.ar[verseIdx]
      content.appendChild(arabic)
    }
    if (surahData.en && surahData.en[verseIdx]) {
      const english = document.createElement('div')
      english.className = 'qa-review-mark-english'
      english.textContent = surahData.en[verseIdx]
      content.appendChild(english)
    }
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

  card.appendChild(header)
  card.appendChild(content)
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
