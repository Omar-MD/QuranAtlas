/**
 * Surah list route — #/surahs.
 * Header + live count, search (name/number/ref), segmented filter, continue-reading
 * card on All, bookmark left-edge rows.
 */

import { getSurahs } from '../data/dataset.js'
import { getMeaning } from '../data/surah-meanings.js'
import { getAll as getAllMarks } from '../marks/store.js'
import { get } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { announce } from '../a11y/announcer.js'
import * as surahsState from '../state/surahs.js'

let _initSeq = 0

export async function init(_params = {}) {
  const seq = ++_initSeq
  const mainContent = document.getElementById('main-content')
  if (!mainContent) { return }

  while (mainContent.firstChild) { mainContent.removeChild(mainContent.firstChild) }

  const [surahs, marks, lastSurface, recentList] = await Promise.all([
    getSurahs(),
    getAllMarks().catch(() => []),
    get('settings', 'lastSurface').catch(() => null),
    get('settings', 'recentSurahs').catch(() => null),
  ])
  if (seq !== _initSeq) { return }

  const bookmarkedSet = new Set(marks.map(m => parseInt(m.verseKey.split(':')[0], 10)))
  const recentSurahs = Array.isArray(recentList?.value) ? recentList.value.slice(0, 5) : []
  const resumeMatch = (lastSurface?.value || '').match(/^#\/s\/(\d+)(?:\/(\d+))?/)
  const resume = resumeMatch
    ? { surah: parseInt(resumeMatch[1], 10), verse: resumeMatch[2] ? parseInt(resumeMatch[2], 10) : 1 }
    : null

  surahsState.set({ filter: 'all', searchQuery: '' })

  const page = document.createElement('div')
  page.className = 'qa-surah-list-page'

  const header = document.createElement('header')
  header.className = 'qa-sl-header'
  const title = document.createElement('h1')
  title.className = 'qa-sl-title'
  title.textContent = 'Surahs'
  const count = document.createElement('span')
  count.className = 'qa-sl-count'
  count.textContent = '114'
  header.appendChild(title)
  header.appendChild(count)
  page.appendChild(header)

  const searchWrap = document.createElement('label')
  searchWrap.className = 'qa-sl-search'
  const searchIcon = document.createElement('span')
  searchIcon.className = 'qa-sl-search-icon'
  searchIcon.setAttribute('aria-hidden', 'true')
  searchIcon.textContent = '\u2315'
  const search = document.createElement('input')
  search.type = 'search'
  search.className = 'qa-sl-search-input'
  search.setAttribute('placeholder', 'Search surah or number')
  search.setAttribute('aria-label', 'Search surah by name or number')
  search.setAttribute('autocomplete', 'off')
  search.maxLength = 20
  const kbd = document.createElement('span')
  kbd.className = 'qa-sl-search-kbd'
  kbd.textContent = '\u2318K'
  searchWrap.appendChild(searchIcon)
  searchWrap.appendChild(search)
  searchWrap.appendChild(kbd)
  page.appendChild(searchWrap)

  const seg = document.createElement('div')
  seg.className = 'qa-sl-seg'
  seg.setAttribute('role', 'tablist')
  for (const [key, label] of [['all', 'All'], ['bookmarked', 'Bookmarked'], ['recent', 'Recent']]) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'qa-sl-seg-item'
    b.setAttribute('role', 'tab')
    b.setAttribute('data-filter', key)
    b.textContent = label
    b.addEventListener('click', () => { surahsState.set({ filter: key }); rerender() })
    seg.appendChild(b)
  }
  page.appendChild(seg)

  const hint = document.createElement('div')
  hint.className = 'qa-sl-hint qa-sl-hint--hidden'
  page.appendChild(hint)

  const list = document.createElement('ul')
  list.className = 'qa-sl-list'
  page.appendChild(list)

  mainContent.appendChild(page)

  function rerender() {
    const { filter, searchQuery } = surahsState.get()
    for (const b of seg.querySelectorAll('.qa-sl-seg-item')) {
      const on = b.getAttribute('data-filter') === filter
      b.classList.toggle('qa-sl-seg-item--on', on)
      b.setAttribute('aria-selected', on ? 'true' : 'false')
    }

    let items = surahs
    if (filter === 'bookmarked') {
      items = surahs.filter(s => bookmarkedSet.has(s.n))
    } else if (filter === 'recent') {
      const order = new Map(recentSurahs.map((n, i) => [n, i]))
      items = surahs
        .filter(s => order.has(s.n))
        .sort((a, b) => order.get(a.n) - order.get(b.n))
    }

    const q = searchQuery.trim()
    const qLower = q.toLowerCase()
    const numericMatch = q.match(/^(\d+)$/)
    const refMatch = q.match(/^(\d+)\s*:\s*(\d+)$/)

    if (refMatch) {
      const sNum = parseInt(refMatch[1], 10)
      const vNum = parseInt(refMatch[2], 10)
      const meta = surahs.find(s => s.n === sNum)
      if (meta && vNum >= 1 && vNum <= meta.count) {
        emit(Events.NAVIGATION_NAVIGATE, /** @type {import('../core/constants.js').NavigationNavigatePayload} */({ surah: sNum, verse: vNum }))
        return
      }
    }

    let jumpingN = null
    if (numericMatch) {
      jumpingN = parseInt(numericMatch[1], 10)
      if (jumpingN >= 1 && jumpingN <= 114) {
        items = items.filter(s => s.n === jumpingN)
      }
    } else if (q) {
      items = items.filter(s => {
        const name = (s.name || '').toLowerCase()
        const meaning = (getMeaning(s.n) || '').toLowerCase()
        const ar = (s.arabic || '').toLowerCase()
        return name.includes(qLower) || meaning.includes(qLower) || ar.includes(qLower)
      })
    }

    if (filter === 'bookmarked') {
      count.textContent = `${items.length} bookmarked`
    } else if (filter === 'recent') {
      count.textContent = items.length ? `${items.length} recent` : 'No recent'
    } else if (q) {
      count.textContent = items.length === 1 ? '1 match' : `${items.length} matches`
    } else {
      count.textContent = '114'
    }

    while (hint.firstChild) { hint.removeChild(hint.firstChild) }
    if (jumpingN && jumpingN >= 1 && jumpingN <= 114 && items.length === 1) {
      hint.classList.remove('qa-sl-hint--hidden')
      hint.textContent = `Jumping to #${jumpingN}`
    } else if (q && items.length === 0) {
      hint.classList.remove('qa-sl-hint--hidden')
      hint.textContent = 'No matches — try a surah name, a number 1\u2013114, or a reference like 2:255.'
    } else {
      hint.classList.add('qa-sl-hint--hidden')
    }

    while (list.firstChild) { list.removeChild(list.firstChild) }

    if (filter === 'all' && !q && resume) {
      const meta = surahs.find(s => s.n === resume.surah)
      if (meta) {
        const cont = document.createElement('li')
        cont.className = 'qa-sl-continue'
        const ico = document.createElement('span')
        ico.className = 'qa-sl-continue-icon'
        ico.setAttribute('aria-hidden', 'true')
        ico.textContent = '\u21BB'
        const body = document.createElement('span')
        body.className = 'qa-sl-continue-body'
        const eyebrow = document.createElement('span')
        eyebrow.className = 'qa-sl-continue-eyebrow'
        eyebrow.textContent = 'Continue reading'
        const ref = document.createElement('span')
        ref.className = 'qa-sl-continue-ref'
        ref.textContent = `${meta.name} \u00B7 verse ${resume.verse}`
        body.appendChild(eyebrow)
        body.appendChild(ref)
        const chev = document.createElement('span')
        chev.className = 'qa-sl-continue-chev'
        chev.setAttribute('aria-hidden', 'true')
        chev.textContent = '\u203A'
        cont.appendChild(ico)
        cont.appendChild(body)
        cont.appendChild(chev)
        cont.addEventListener('click', () => {
          window.location.hash = resume.verse > 1
            ? `#/s/${resume.surah}/${resume.verse}`
            : `#/s/${resume.surah}`
        })
        list.appendChild(cont)
      }
    }

    for (const s of items) {
      list.appendChild(renderRow(s))
    }
  }

  function renderRow(s) {
    const li = document.createElement('li')
    li.className = 'qa-sl-row'
    if (bookmarkedSet.has(s.n)) { li.classList.add('qa-sl-row--bm') }

    const anchor = document.createElement('a')
    anchor.className = 'qa-sl-row-anchor'
    anchor.href = `#/s/${s.n}`

    const num = document.createElement('span')
    num.className = 'qa-sl-row-num'
    num.textContent = String(s.n)

    const mid = document.createElement('span')
    mid.className = 'qa-sl-row-mid'
    const en = document.createElement('span')
    en.className = 'qa-sl-row-en'
    en.textContent = s.name || ''
    const meaning = document.createElement('span')
    meaning.className = 'qa-sl-row-meaning'
    meaning.textContent = getMeaning(s.n) || ''
    mid.appendChild(en)
    mid.appendChild(meaning)

    const ar = document.createElement('span')
    ar.className = 'qa-sl-row-ar'
    ar.setAttribute('dir', 'rtl')
    ar.textContent = s.arabic || ''

    const meta = document.createElement('span')
    meta.className = 'qa-sl-row-meta'
    const vc = document.createElement('span')
    vc.className = 'qa-sl-row-vcount'
    vc.textContent = String(s.count || '')
    const ty = document.createElement('span')
    ty.className = 'qa-sl-row-type'
    ty.textContent = (s.type || '').toLowerCase()
    meta.appendChild(vc)
    meta.appendChild(ty)

    anchor.appendChild(num)
    anchor.appendChild(mid)
    anchor.appendChild(ar)
    anchor.appendChild(meta)
    li.appendChild(anchor)
    return li
  }

  search.addEventListener('input', () => {
    surahsState.set({ searchQuery: search.value })
    rerender()
  })

  rerender()
  announce('Surah list')

  return () => { ++_initSeq }
}
