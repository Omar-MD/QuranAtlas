/**
 * Review hub: All Marks view.
 * Surah-grouped and flat views, tag/surah filtering, sort, pagination.
 */

import { getAll, getByTag, del as deleteMark, save as saveMark } from '../marks/store.js'
import { getColorForTag } from '../marks/tags.js'
import { getSurahs, getSurah } from '../data/dataset.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { save as saveState, load as loadState, getDefaultState } from './state.js'
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
let _openEditor = null
let unsubSyncUpdate = null
let unsubVisibilityVisible = null

/**
 * Initialize the Review Hub.
 */
export async function init(params = {}, { openEditor } = {}) {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

  _openEditor = openEditor || null

  // Tag deep link: #/t/:tag -> render FVR directly
  if (params.tag !== undefined) {
    await initTagDeepLink(params.tag, mainContent)
    return
  }

  try {
    surahs = await getSurahs()
  } catch (error) {
    logger.error('Failed to load surahs for Review Hub:', {
      error,
    })
    surahs = []
  }

  const saved = await loadState()
  currentState = saved || getDefaultState()

  await reloadMarks()
  render(mainContent)
  setInitialFocus()

  emit(Events.REVIEW_OPEN)

  if (unsubSyncUpdate) {
    unsubSyncUpdate()
    unsubSyncUpdate = null
  }
  if (unsubVisibilityVisible) {
    unsubVisibilityVisible()
    unsubVisibilityVisible = null
  }

  unsubSyncUpdate = on(Events.SYNC_UPDATE_RECEIVED, async () => {
    await reloadMarks()
    const mc = document.getElementById('main-content')
    if (mc) {
      render(mc)
    }
  })

  unsubVisibilityVisible = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    await reloadMarks()
    const mc = document.getElementById('main-content')
    if (mc) {
      render(mc)
    }
  })

  return () => {
    if (unsubSyncUpdate) { unsubSyncUpdate(); unsubSyncUpdate = null }
    if (unsubVisibilityVisible) { unsubVisibilityVisible(); unsubVisibilityVisible = null }
    _openEditor = null
    clearUndoToast()
    const mc = document.getElementById('main-content')
    if (mc) { mc.textContent = '' }
    currentState = null
    allMarks = []
    sortedMarks = []
    filteredMarks = []
    displayedCount = 0
  }
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
    logger.error('Failed to load surahs for tag deep link:', {
      tag,
      error,
    })
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
 * Apply a filter and re-render with debouncing.
 * Does NOT reload from IDB — just re-filters the pre-sorted cache (O(n)).
 * @param {{ activeTag?: string|null, surahFilter?: number|null }} filter
 */
export async function applyFilter(filter) {
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
}

/**
 * Reload marks from IDB and rebuild the sorted cache.
 */
async function reloadMarks() {
  allMarks = await getAll()
  sortedMarks = sortMarks(allMarks, currentState?.sortBy)
}

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
  if (currentState.groupBy === 'tag') {
    renderTagGrouped(container, pageMarks)
  } else if (currentState.groupBy === 'surah') {
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
  const firstFocusable = document.querySelector('.qa-review-controls select')
  if (firstFocusable) {
    firstFocusable.focus()
  }
}

function renderControls(container) {
  const controls = document.createElement('div')
  controls.className = 'qa-review-controls'

  // Group dropdown
  const groupSelect = document.createElement('select')
  groupSelect.className = 'qa-review-select'
  groupSelect.setAttribute('data-control', 'group')
  groupSelect.setAttribute('aria-label', 'Group by')
  for (const [value, label] of [['tag', 'Group: Tag'], ['surah', 'Group: Surah'], ['flat', 'Group: Date']]) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    if (value === currentState.groupBy) opt.selected = true
    groupSelect.appendChild(opt)
  }
  groupSelect.addEventListener('change', async () => {
    currentState.groupBy = groupSelect.value
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(groupSelect)

  // Sort dropdown
  const sortSelect = document.createElement('select')
  sortSelect.className = 'qa-review-select'
  sortSelect.setAttribute('data-control', 'sort')
  sortSelect.setAttribute('aria-label', 'Sort by')
  for (const [value, label] of [['updatedAt', 'Sort: Recent'], ['createdAt', 'Sort: Created']]) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    if (value === currentState.sortBy) opt.selected = true
    sortSelect.appendChild(opt)
  }
  sortSelect.addEventListener('change', async () => {
    currentState.sortBy = sortSelect.value
    sortedMarks = sortMarks(allMarks, currentState.sortBy)
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(sortSelect)

  // Tag filter dropdown
  const uniqueTags = [...new Set(allMarks.flatMap(m => m.tags))].sort()
  const tagSelect = document.createElement('select')
  tagSelect.className = 'qa-review-select'
  tagSelect.setAttribute('data-control', 'tag')
  tagSelect.setAttribute('aria-label', 'Filter by tag')
  const tagAllOpt = document.createElement('option')
  tagAllOpt.value = ''
  tagAllOpt.textContent = 'Tag: All'
  tagSelect.appendChild(tagAllOpt)
  for (const tag of uniqueTags) {
    const opt = document.createElement('option')
    opt.value = tag
    opt.textContent = tag
    if (tag === currentState.activeTag) opt.selected = true
    tagSelect.appendChild(opt)
  }
  tagSelect.addEventListener('change', async () => {
    currentState.activeTag = tagSelect.value || null
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(tagSelect)

  // Surah filter dropdown — only surahs that have marks
  const surahsWithMarks = [...new Set(allMarks.map(m => parseInt(m.verseKey.split(':')[0], 10)))].sort((a, b) => a - b)
  const surahSelect = document.createElement('select')
  surahSelect.className = 'qa-review-select'
  surahSelect.setAttribute('data-control', 'surah')
  surahSelect.setAttribute('aria-label', 'Filter by surah')
  const surahAllOpt = document.createElement('option')
  surahAllOpt.value = ''
  surahAllOpt.textContent = 'Surah: All'
  surahSelect.appendChild(surahAllOpt)
  for (const num of surahsWithMarks) {
    const opt = document.createElement('option')
    opt.value = String(num)
    const meta = surahs.find(s => s.n === num)
    opt.textContent = meta ? `${meta.name} (${num})` : `Surah ${num}`
    if (num === currentState.surahFilter) opt.selected = true
    surahSelect.appendChild(opt)
  }
  surahSelect.addEventListener('change', async () => {
    currentState.surahFilter = surahSelect.value ? parseInt(surahSelect.value, 10) : null
    await saveState(currentState)
    displayedCount = 0
    render(container)
  })
  controls.appendChild(surahSelect)

  container.appendChild(controls)

  // Active filter chips
  if (currentState.activeTag || currentState.surahFilter) {
    const chipBar = document.createElement('div')
    chipBar.className = 'qa-review-active-filters'

    if (currentState.activeTag) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      chip.textContent = currentState.activeTag
      const dismiss = document.createElement('button')
      dismiss.textContent = '✕'
      dismiss.setAttribute('aria-label', `Clear ${currentState.activeTag} filter`)
      dismiss.addEventListener('click', async () => {
        currentState.activeTag = null
        await saveState(currentState)
        displayedCount = 0
        render(container)
      })
      chip.appendChild(dismiss)
      chipBar.appendChild(chip)
    }

    if (currentState.surahFilter) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      const meta = surahs.find(s => s.n === currentState.surahFilter)
      chip.textContent = meta ? meta.name : `Surah ${currentState.surahFilter}`
      const dismiss = document.createElement('button')
      dismiss.textContent = '✕'
      dismiss.setAttribute('aria-label', `Clear surah filter`)
      dismiss.addEventListener('click', async () => {
        currentState.surahFilter = null
        await saveState(currentState)
        displayedCount = 0
        render(container)
      })
      chip.appendChild(dismiss)
      chipBar.appendChild(chip)
    }

    const clearAll = document.createElement('button')
    clearAll.className = 'qa-review-clear-all-btn'
    clearAll.textContent = 'Clear all'
    clearAll.addEventListener('click', async () => {
      currentState.activeTag = null
      currentState.surahFilter = null
      await saveState(currentState)
      displayedCount = 0
      render(container)
    })
    chipBar.appendChild(clearAll)

    container.appendChild(chipBar)
  }
}

/**
 * Render marks grouped by tag → surah (two-level hierarchy).
 * Multi-tagged marks appear under each relevant tag group.
 * @param {HTMLElement} container
 * @param {Array} marks
 */
function renderTagGrouped(container, marks) {
  // Build tag → marks map. Multi-tagged marks appear under each tag.
  const tagMap = new Map()
  for (const mark of marks) {
    for (const tag of mark.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag).push(mark)
    }
  }

  // Sort tags alphabetically
  const sortedTags = [...tagMap.keys()].sort()
  const fragment = document.createDocumentFragment()

  for (const tag of sortedTags) {
    const tagMarks = tagMap.get(tag)

    // Tag header
    const header = document.createElement('div')
    header.className = 'qa-review-tag-header'

    const dot = document.createElement('span')
    dot.className = 'qa-review-tag-header-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    header.appendChild(dot)

    const label = document.createElement('span')
    label.className = 'qa-review-tag-header-label'
    label.textContent = tag
    header.appendChild(label)

    const count = document.createElement('span')
    count.className = 'qa-review-tag-header-count'
    count.textContent = `(${tagMarks.length})`
    header.appendChild(count)

    fragment.appendChild(header)

    // Group marks within this tag by surah
    const surahMap = new Map()
    for (const mark of tagMarks) {
      const surahNum = parseInt(mark.verseKey.split(':')[0], 10)
      if (!surahMap.has(surahNum)) surahMap.set(surahNum, [])
      surahMap.get(surahNum).push(mark)
    }

    const sortedSurahs = [...surahMap.keys()].sort((a, b) => a - b)
    for (const surahNum of sortedSurahs) {
      const surahHeader = document.createElement('div')
      surahHeader.className = 'qa-review-surah-header'
      surahHeader.setAttribute('data-surah-group', String(surahNum))
      const meta = surahs.find(s => s.n === surahNum)
      surahHeader.textContent = meta ? `${meta.name} (${meta.n})` : `Surah ${surahNum}`
      fragment.appendChild(surahHeader)

      // Sort marks by verse number (canonical order)
      const surahMarks = surahMap.get(surahNum)
        .sort((a, b) => {
          const aVerse = parseInt(a.verseKey.split(':')[1], 10)
          const bVerse = parseInt(b.verseKey.split(':')[1], 10)
          return aVerse - bVerse
        })

      for (const mark of surahMarks) {
        fragment.appendChild(renderMarkCard(mark, null))
      }
    }
  }

  container.appendChild(fragment)
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
  const fragment = document.createDocumentFragment()

  for (const surahNum of sortedKeys) {
    const header = document.createElement('div')
    header.className = 'qa-review-surah-header'
    header.setAttribute('data-surah-group', String(surahNum))
    const meta = surahs.find(s => s.n === surahNum)
    header.textContent = meta ? `${meta.name} (${meta.n})` : `Surah ${surahNum}`
    fragment.appendChild(header)

    for (const mark of groups.get(surahNum)) {
      fragment.appendChild(renderMarkCard(mark, null))
    }
  }

  container.appendChild(fragment)
}

async function renderFlat(container, marks) {
  const fragment = document.createDocumentFragment()
  for (const mark of marks) {
    fragment.appendChild(renderMarkCard(mark, null))
  }
  container.appendChild(fragment)
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
    dot.style.backgroundColor = getColorForTag(tag)
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
    if (_openEditor) {
      _openEditor(mark.verseKey)
    }
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

    if (currentState.groupBy === 'tag') {
      renderTagGrouped(container, nextPage)
    } else if (currentState.groupBy === 'surah') {
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
