/**
 * Review hub: All Marks view.
 * Surah-grouped and flat views, tag/surah filtering, sort, pagination.
 */

import { getAll, getByTag } from '../marks/store.js'
import { getColorForTag } from '../marks/tags.js'
import { getSurahs, getSurah } from '../data/dataset.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { save as saveState, load as loadState, getDefaultState } from './state.js'
import { clearUndoToast } from '../core/ui.js'
import { validateTagParam } from '../safety/input-validator.js'
import { announce } from '../a11y/announcer.js'
import * as reviewState from '../state/review.js'

const PAGE_SIZE = 30

let allMarks = []
let sortedMarks = []  // Pre-sorted cache; rebuilt on load or sort change
let filteredMarks = []
let displayedCount = 0
let surahs = []
let _openEditor = null
let unsubSyncUpdate = null
let unsubVisibilityVisible = null
let _railActiveGroup = null     // single-select (surah/date modes only)

// Map state sort keys to IDB field names
function sortKeyToField(sortKey) {
  return sortKey === 'created' ? 'createdAt' : 'updatedAt'
}

/**
 * Initialize the Review Hub.
 */
export async function init(params = {}, { openEditor } = {}) {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

  _openEditor = openEditor || null
  reviewState.set({ activeTags: [] })
  _railActiveGroup = null

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
  const loaded = saved || getDefaultState()
  // 'fvr' view is URL-driven (only active while on #/t/:tag). Reset it when
  // entering the hub directly via #/review so controls always render.
  if (loaded.view === 'fvr') {
    loaded.view = 'all'
  }

  // Map IDB sortBy field to state sort key
  const sortVal = loaded.sortBy === 'createdAt' ? 'created' : 'recent'

  reviewState.set({
    view: loaded.view,
    groupBy: loaded.groupBy || 'tag',
    sort: sortVal,
    activeTag: loaded.activeTag || null,
    activeTags: [],
    surahFilter: loaded.surahFilter || null,
  })

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
    _railActiveGroup = null
    reviewState.set({ activeTags: [] })
    clearUndoToast()
    const mc = document.getElementById('main-content')
    if (mc) { mc.textContent = '' }
    reviewState.set({
      view: 'all',
      groupBy: 'tag',
      sort: 'recent',
      activeTag: null,
      activeTags: [],
      surahFilter: null,
    })
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

  const idbState = {
    view: 'fvr',
    activeTag: tag,
    surahFilter: null,
    sortBy: 'updatedAt',
    groupBy: 'surah',
  }
  await saveState(idbState)
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

  reviewState.set({
    view: 'fvr',
    groupBy: 'surah',
    sort: 'recent',
    activeTag: tag,
    activeTags: [],
    surahFilter: null,
  })

  allMarks = marks
  sortedMarks = sortMarks(marks, reviewState.get().sort)
  filteredMarks = filterMarks(sortedMarks, reviewState.get())
  displayedCount = 0

  container.textContent = ''
  const layout = document.createElement('div')
  layout.className = 'qa-fvr-layout'
  container.appendChild(layout)

  renderFvrHeader(layout, tag, marks)
  render(layout)
  setInitialFocus()
  emit(Events.REVIEW_OPEN)
}

function renderFvrHeader(container, tag, marks) {
  container.textContent = ''

  const wrap = document.createElement('div')
  wrap.className = 'qa-fvr-header'

  const back = document.createElement('a')
  back.className = 'qa-fvr-back'
  back.href = '#/review'
  back.textContent = '\u2190 Marks'

  const hdr = document.createElement('header')
  hdr.className = 'qa-fvr-title-block'
  const label = document.createElement('div')
  label.className = 'qa-fvr-label'
  label.textContent = 'Tag'
  const title = document.createElement('h1')
  title.className = 'qa-fvr-title'
  const dot = document.createElement('span')
  dot.className = 'qa-fvr-dot'
  dot.style.backgroundColor = getColorForTag(tag)
  const name = document.createElement('span')
  name.className = 'qa-fvr-name'
  name.textContent = tag
  title.appendChild(dot)
  title.appendChild(name)

  const stats = document.createElement('div')
  stats.className = 'qa-fvr-stats'
  const surahsCount = new Set(marks.map(m => parseInt(m.verseKey.split(':')[0], 10))).size
  const vSpan = document.createElement('span')
  const vStrong = document.createElement('strong')
  vStrong.textContent = String(marks.length)
  vSpan.appendChild(vStrong)
  vSpan.appendChild(document.createTextNode(` verse${marks.length === 1 ? '' : 's'}`))
  const sep = document.createElement('span')
  sep.className = 'qa-fvr-sep'
  sep.textContent = '\u00B7'
  const sSpan = document.createElement('span')
  const sStrong = document.createElement('strong')
  sStrong.textContent = String(surahsCount)
  sSpan.appendChild(sStrong)
  sSpan.appendChild(document.createTextNode(` surah${surahsCount === 1 ? '' : 's'}`))
  stats.appendChild(vSpan)
  stats.appendChild(sep)
  stats.appendChild(sSpan)

  hdr.appendChild(label)
  hdr.appendChild(title)
  hdr.appendChild(stats)

  wrap.appendChild(back)
  wrap.appendChild(hdr)
  container.appendChild(wrap)
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
  const patch = {}
  if (filter.activeTag !== undefined) {
    patch.activeTag = filter.activeTag
  }
  if (filter.surahFilter !== undefined) {
    patch.surahFilter = filter.surahFilter
  }
  reviewState.set(patch)
  const s = reviewState.get()
  await saveState({ ...s, sortBy: sortKeyToField(s.sort) })
  emit(Events.REVIEW_FILTER, { tags: s.activeTag, surah: s.surahFilter })

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
  sortedMarks = sortMarks(allMarks, reviewState.get().sort)
}

/**
 * Sort marks by a given key. Pure function — returns a new array.
 * O(n log n) — called only on load or sort-key change.
 * @param {Array} marks
 * @param {string} [sortKey='recent']
 * @returns {Array}
 */
function sortMarks(marks, sortKey = 'recent') {
  const field = sortKeyToField(sortKey)
  return [...marks].sort((a, b) => b[field] - a[field])
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
  const s = reviewState.get()
  const isFvr = s.view === 'fvr'
  const isDesktop = !isFvr && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1180px)').matches
  const railActiveTags = new Set(s.activeTags)

  if (!isFvr) {
    container.textContent = ''
  }

  // Filter from pre-sorted cache — O(n) with no sort overhead
  filteredMarks = filterMarks(sortedMarks, s)

  // Apply rail filters (desktop only)
  if (isDesktop) {
    if (s.groupBy === 'tag' && railActiveTags.size > 0) {
      filteredMarks = filteredMarks.filter(m => m.tags.some(t => railActiveTags.has(t)))
    } else if (s.groupBy === 'surah' && _railActiveGroup !== null) {
      const surahNum = parseInt(_railActiveGroup, 10)
      filteredMarks = filteredMarks.filter(m => parseInt(m.verseKey.split(':')[0], 10) === surahNum)
    } else if (s.groupBy === 'flat' && _railActiveGroup !== null) {
      filteredMarks = filteredMarks.filter(m => {
        const d = m.createdAt ? new Date(m.createdAt) : null
        if (!d) {return false}
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return ym === _railActiveGroup
      })
    }
  }

  if (filteredMarks.length === 0 && allMarks.length === 0) {
    renderEmptyState(container)
    return
  }

  if (filteredMarks.length === 0) {
    renderNoResults(container)
    return
  }

  // Set up layout — desktop gets left rail + main column
  let cardHost
  if (isDesktop) {
    const layout = document.createElement('div')
    layout.className = 'qa-review-layout'
    layout.appendChild(buildRail())
    const main = document.createElement('div')
    main.className = 'qa-review-main'
    layout.appendChild(main)
    container.appendChild(layout)
    cardHost = main
  } else {
    cardHost = container
  }

  if (!isFvr) {
    renderControls(cardHost)
  }

  // Chip bar — tag mode with active multi-select
  if (isDesktop && s.groupBy === 'tag' && railActiveTags.size > 0) {
    const bar = document.createElement('div')
    bar.className = 'qa-review-filter-bar'

    const label = document.createElement('span')
    label.className = 'qa-review-filter-bar-label'
    label.textContent = 'Filtering by'
    bar.appendChild(label)

    for (const tag of railActiveTags) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      const dot = document.createElement('span')
      dot.className = 'qa-review-filter-chip-dot'
      dot.style.backgroundColor = getColorForTag(tag)
      chip.appendChild(dot)
      chip.appendChild(document.createTextNode(tag))
      const x = document.createElement('button')
      x.type = 'button'
      x.textContent = '\u00D7' // ×
      x.setAttribute('aria-label', `Remove ${tag} filter`)
      x.addEventListener('click', () => {
        const updated = new Set(reviewState.get().activeTags)
        updated.delete(tag)
        reviewState.set({ activeTags: Array.from(updated) })
        const mc = document.getElementById('main-content')
        if (mc) {render(mc)}
      })
      chip.appendChild(x)
      bar.appendChild(chip)
    }

    const clearAll = document.createElement('button')
    clearAll.type = 'button'
    clearAll.className = 'qa-review-filter-bar-clear'
    clearAll.textContent = 'Clear all'
    clearAll.addEventListener('click', () => {
      reviewState.set({ activeTags: [] })
      const mc = document.getElementById('main-content')
      if (mc) {render(mc)}
    })
    bar.appendChild(clearAll)

    cardHost.appendChild(bar)
  }

  // Wrap cards in list container
  const cardList = document.createElement('div')
  cardList.className = 'qa-review-card-list'
  cardHost.appendChild(cardList)

  const pageMarks = filteredMarks.slice(0, PAGE_SIZE)
  displayedCount = pageMarks.length

  // Render synchronously first — flat, unique, single-column
  renderCardList(cardList, pageMarks)

  // Try to load content - this won't block render
  loadVerseContentBackground(pageMarks).catch(() => {
    // Silently fail - content just won't show
  })

  if (displayedCount < filteredMarks.length) {
    renderLoadMore(cardList)
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
    const contentArea = card.querySelector('.qa-review-card-content')
    if (!contentArea || contentArea.querySelector('.qa-review-card-ar')) {
      continue
    }

    if (surahData.ar && surahData.ar[verseIdx]) {
      const arabic = document.createElement('div')
      arabic.className = 'qa-review-card-ar'
      arabic.setAttribute('dir', 'rtl')
      arabic.textContent = surahData.ar[verseIdx]
      contentArea.appendChild(arabic)
    }
    if (surahData.en && surahData.en[verseIdx]) {
      const english = document.createElement('div')
      english.className = 'qa-review-card-en'
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

/**
 * Build the desktop left rail: group-by segment + filtered list of groups.
 */
function buildRail() {
  const s = reviewState.get()
  const railActiveTags = new Set(s.activeTags)

  const rail = document.createElement('aside')
  rail.className = 'qa-review-rail'

  const segLabel = document.createElement('div')
  segLabel.className = 'qa-review-rail-section'
  segLabel.textContent = 'Group by'
  rail.appendChild(segLabel)

  const seg = document.createElement('div')
  seg.className = 'qa-review-seg'
  seg.style.cssText = 'width:100%;display:flex'
  for (const [key, label] of [['tag', 'Tag'], ['surah', 'Surah'], ['flat', 'Date']]) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'qa-review-seg-item' + (s.groupBy === key ? ' qa-review-seg-item--on' : '')
    btn.style.flex = '1'
    btn.textContent = label
    btn.addEventListener('click', () => {
      reviewState.set({ groupBy: key, activeTags: [] })
      _railActiveGroup = null
      const currentS = reviewState.get()
      saveState({ ...currentS, sortBy: sortKeyToField(currentS.sort) }).catch(() => {})
      const mc = document.getElementById('main-content')
      if (mc) {render(mc)}
    })
    seg.appendChild(btn)
  }
  rail.appendChild(seg)

  const groupsLabel = document.createElement('div')
  groupsLabel.className = 'qa-review-rail-section'
  groupsLabel.textContent = s.groupBy === 'tag' ? 'Tags'
    : s.groupBy === 'surah' ? 'Surahs'
    : 'Dates'
  rail.appendChild(groupsLabel)

  for (const bucket of computeRailBuckets(allMarks, s.groupBy)) {
    const row = document.createElement('button')
    row.type = 'button'
    const isOn = s.groupBy === 'tag'
      ? railActiveTags.has(bucket.key)
      : _railActiveGroup === bucket.key
    row.className = 'qa-review-rail-row' + (isOn ? ' qa-review-rail-row--on' : '')
    if (bucket.dotColor) {
      const dot = document.createElement('span')
      dot.className = 'qa-review-rail-dot'
      dot.style.backgroundColor = bucket.dotColor
      row.appendChild(dot)
    }
    const labelEl = document.createElement('span')
    labelEl.textContent = bucket.label
    row.appendChild(labelEl)
    const countEl = document.createElement('span')
    countEl.className = 'qa-review-rail-count'
    countEl.textContent = bucket.count
    row.appendChild(countEl)
    row.addEventListener('click', () => {
      if (reviewState.get().groupBy === 'tag') {
        const updated = new Set(reviewState.get().activeTags)
        if (updated.has(bucket.key)) {
          updated.delete(bucket.key)
        } else {
          updated.add(bucket.key)
        }
        reviewState.set({ activeTags: Array.from(updated) })
      } else {
        _railActiveGroup = _railActiveGroup === bucket.key ? null : bucket.key
      }
      const mc = document.getElementById('main-content')
      if (mc) {render(mc)}
    })
    rail.appendChild(row)
  }

  return rail
}

/**
 * Compute grouped bucket list for the desktop rail.
 * @returns {{ key: string, label: string, count: number, dotColor?: string }[]}
 */
function computeRailBuckets(marks, groupBy) {
  if (groupBy === 'tag') {
    const byTag = new Map()
    for (const m of marks) {
      for (const t of m.tags || []) {
        byTag.set(t, (byTag.get(t) || 0) + 1)
      }
    }
    return Array.from(byTag.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ key: tag, label: tag, count, dotColor: getColorForTag(tag) }))
  }
  if (groupBy === 'surah') {
    const bySurah = new Map()
    for (const m of marks) {
      const s = parseInt(m.verseKey.split(':')[0], 10)
      bySurah.set(s, (bySurah.get(s) || 0) + 1)
    }
    return Array.from(bySurah.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([n, count]) => {
        const meta = surahs.find(s => s.n === n)
        return { key: String(n), label: meta ? meta.name : `Surah ${n}`, count }
      })
  }
  // flat — group by YYYY-MM
  const byMonth = new Map()
  for (const m of marks) {
    const d = m.createdAt ? new Date(m.createdAt) : null
    if (!d) {continue}
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth.set(ym, (byMonth.get(ym) || 0) + 1)
  }
  return Array.from(byMonth.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ym, count]) => ({ key: ym, label: ym, count }))
}

function renderControls(container) {
  const s = reviewState.get()
  const controls = document.createElement('div')
  controls.className = 'qa-review-controls'

  // Group segment pill
  const groupSeg = document.createElement('div')
  groupSeg.className = 'qa-review-seg'
  groupSeg.setAttribute('role', 'tablist')
  groupSeg.setAttribute('aria-label', 'Group by')
  for (const [value, label] of [['tag', 'Tag'], ['surah', 'Surah'], ['flat', 'Date']]) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'qa-review-seg-item'
    b.setAttribute('role', 'tab')
    b.setAttribute('data-group', value)
    b.setAttribute('aria-selected', String(value === s.groupBy))
    if (value === s.groupBy) { b.classList.add('qa-review-seg-item--on') }
    b.textContent = label
    b.addEventListener('click', async () => {
      reviewState.set({ groupBy: value })
      const cs = reviewState.get()
      await saveState({ ...cs, sortBy: sortKeyToField(cs.sort) })
      displayedCount = 0
      render(container)
    })
    groupSeg.appendChild(b)
  }
  controls.appendChild(groupSeg)

  // Sort dropdown
  const sortSelect = document.createElement('select')
  sortSelect.className = 'qa-review-select'
  sortSelect.setAttribute('data-control', 'sort')
  sortSelect.setAttribute('aria-label', 'Sort by')
  for (const [value, label] of [['recent', 'Sort: Recent'], ['created', 'Sort: Created']]) {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    if (value === s.sort) {
      opt.selected = true
    }
    sortSelect.appendChild(opt)
  }
  sortSelect.addEventListener('change', async () => {
    reviewState.set({ sort: sortSelect.value })
    sortedMarks = sortMarks(allMarks, reviewState.get().sort)
    const cs = reviewState.get()
    await saveState({ ...cs, sortBy: sortKeyToField(cs.sort) })
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
    if (tag === s.activeTag) {
      opt.selected = true
    }
    tagSelect.appendChild(opt)
  }
  tagSelect.addEventListener('change', async () => {
    reviewState.set({ activeTag: tagSelect.value || null })
    const cs = reviewState.get()
    await saveState({ ...cs, sortBy: sortKeyToField(cs.sort) })
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
    if (num === s.surahFilter) {
      opt.selected = true
    }
    surahSelect.appendChild(opt)
  }
  surahSelect.addEventListener('change', async () => {
    reviewState.set({ surahFilter: surahSelect.value ? parseInt(surahSelect.value, 10) : null })
    const cs = reviewState.get()
    await saveState({ ...cs, sortBy: sortKeyToField(cs.sort) })
    displayedCount = 0
    render(container)
  })
  controls.appendChild(surahSelect)

  container.appendChild(controls)

  // Active filter chips
  if (s.activeTag || s.surahFilter) {
    const chipBar = document.createElement('div')
    chipBar.className = 'qa-review-active-filters'

    if (s.activeTag) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      chip.textContent = s.activeTag
      const dismiss = document.createElement('button')
      dismiss.textContent = '✕'
      dismiss.setAttribute('aria-label', `Clear ${s.activeTag} filter`)
      dismiss.addEventListener('click', async () => {
        reviewState.set({ activeTag: null })
        const cs = reviewState.get()
        await saveState({ ...cs, sortBy: sortKeyToField(cs.sort) })
        displayedCount = 0
        render(container)
      })
      chip.appendChild(dismiss)
      chipBar.appendChild(chip)
    }

    if (s.surahFilter) {
      const chip = document.createElement('span')
      chip.className = 'qa-review-filter-chip'
      const meta = surahs.find(sr => sr.n === s.surahFilter)
      chip.textContent = meta ? meta.name : `Surah ${s.surahFilter}`
      const dismiss = document.createElement('button')
      dismiss.textContent = '✕'
      dismiss.setAttribute('aria-label', `Clear surah filter`)
      dismiss.addEventListener('click', async () => {
        reviewState.set({ surahFilter: null })
        const cs = reviewState.get()
        await saveState({ ...cs, sortBy: sortKeyToField(cs.sort) })
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
      reviewState.set({ activeTag: null, surahFilter: null })
      const cs = reviewState.get()
      await saveState({ ...cs, sortBy: sortKeyToField(cs.sort) })
      displayedCount = 0
      render(container)
    })
    chipBar.appendChild(clearAll)

    container.appendChild(chipBar)
  }
}

/**
 * Render the mark cards as a flat, unique, single-column list sorted by
 * updatedAt (already sorted upstream). Each mark appears exactly once.
 * @param {HTMLElement} container
 * @param {Array} marks
 */
function renderCardList(container, marks) {
  const fragment = document.createDocumentFragment()
  for (const mark of marks) {
    fragment.appendChild(renderMarkCard(mark, null))
  }
  container.appendChild(fragment)
}

function renderMarkCard(mark, _surahData) {
  const card = document.createElement('article')
  card.className = 'qa-review-card'
  card.setAttribute('data-mark', mark.verseKey)

  const [sStr, vStr] = mark.verseKey.split(':')
  const meta = surahs.find(x => x.n === parseInt(sStr, 10))
  const refEyebrow = document.createElement('div')
  refEyebrow.className = 'qa-review-card-ref'
  refEyebrow.textContent = `${sStr} : ${vStr}${meta ? ` \u00B7 ${meta.name}` : ''}`
  const jump = document.createElement('a')
  jump.className = 'qa-review-card-jump'
  jump.href = `#/s/${sStr}/${vStr}`
  jump.setAttribute('aria-label', `Jump to ${mark.verseKey} in reader`)
  jump.textContent = '\u2197'
  refEyebrow.appendChild(jump)
  card.appendChild(refEyebrow)

  const content = document.createElement('div')
  content.className = 'qa-review-card-content'
  card.appendChild(content)

  if (mark.note) {
    const noteEl = document.createElement('div')
    noteEl.className = 'qa-review-card-note'
    noteEl.textContent = mark.note
    card.appendChild(noteEl)
  }

  if (mark.tags.length > 0) {
    const chips = document.createElement('div')
    chips.className = 'qa-review-card-chips'
    for (const tag of mark.tags) {
      const chip = document.createElement('a')
      chip.className = 'qa-review-card-chip'
      chip.href = `#/t/${encodeURIComponent(tag)}`
      const dot = document.createElement('span')
      dot.className = 'qa-review-card-chip-dot'
      dot.style.backgroundColor = getColorForTag(tag)
      chip.appendChild(dot)
      chip.appendChild(document.createTextNode(tag))
      chips.appendChild(chip)
    }
    card.appendChild(chips)
  }

  card.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) {
      return
    }
    if (_openEditor) { _openEditor(mark.verseKey) }
  })

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

    renderCardList(container, nextPage)

    if (displayedCount < filteredMarks.length) {
      renderLoadMore(container)
    }
  })
  container.appendChild(btn)
}
