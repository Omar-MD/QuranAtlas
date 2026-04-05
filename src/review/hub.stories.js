// TODO: replace with real init() call once review/hub.js is implemented
import { getDefaults } from '../marks/tags.js'

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Pages/Review Hub',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    filter: {
      control: { type: 'select' },
      options: ['all', 'favourite', 'study', 'reflection', 'question'],
      description: 'Filter marks by tag',
    },
  },
  args: {
    filter: 'all',
  },
}

const MOCK_REVIEW_DATA = [
  {
    surah: 'Al-Fatiha',
    verses: [
      { key: '1:1', ar: '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064E\u0647\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0640\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650', en: 'In the name of God, the Gracious, the Merciful', tags: ['favourite'] },
      { key: '1:5', ar: '\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0639\u0652\u0628\u064F\u062F\u064F \u0648\u064E\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0633\u0652\u062A\u064E\u0639\u0650\u064A\u0646\u064F', en: 'You alone we worship, and You alone we ask for help', tags: ['study'] },
    ],
  },
  {
    surah: 'Ya-Sin',
    verses: [
      { key: '36:1', ar: '\u064A\u0633\u06D3', en: 'Ya, Sin', tags: ['study'] },
    ],
  },
]

function buildTagColors() {
  const colors = {}
  getDefaults().forEach(t => { colors[t.label] = t.color })
  return colors
}

function renderReviewHub(filter) {
  const tagColors = buildTagColors()

  const filteredData = MOCK_REVIEW_DATA.map(surah => ({
    ...surah,
    verses: filter === 'all'
      ? surah.verses
      : surah.verses.filter(v => v.tags.includes(filter)),
  })).filter(surah => surah.verses.length > 0)

  const mainContent = document.getElementById('main-content')
  if (!mainContent) { return document.createElement('div') }

  while (mainContent.firstChild) {
    mainContent.removeChild(mainContent.firstChild)
  }

  const container = document.createElement('div')
  container.style.cssText = 'min-height:100dvh;'

  // Header with filter chips
  const header = document.createElement('div')
  header.style.cssText = 'padding:1rem;border-bottom:1px solid var(--qa-border);'

  const title = document.createElement('h2')
  title.style.cssText = 'font-size:1.25rem;color:var(--qa-text-primary);margin:0 0 0.75rem;'
  title.textContent = 'Review Marks'
  header.appendChild(title)

  const chips = document.createElement('div')
  chips.style.cssText = 'display:flex;gap:0.5rem;overflow-x:auto;padding-bottom:0.25rem;'

  ;['all', 'favourite', 'study', 'reflection', 'question'].forEach(tag => {
    const btn = document.createElement('button')
    const isActive = tag === filter
    const color = tagColors[tag] || 'var(--qa-accent)'
    btn.style.cssText = `padding:0.25rem 0.75rem;border:1px solid ${isActive ? color : 'var(--qa-border)'};border-radius:999px;font-size:0.75rem;cursor:pointer;background:${isActive ? color + '20' : 'transparent'};color:${isActive ? color : 'var(--qa-text-secondary)'};white-space:nowrap;text-transform:capitalize;`
    btn.textContent = tag
    chips.appendChild(btn)
  })

  header.appendChild(chips)
  container.appendChild(header)

  // Marks list
  const list = document.createElement('div')
  list.style.cssText = 'padding:1rem;'

  if (filteredData.length === 0) {
    const empty = document.createElement('div')
    empty.style.cssText = 'text-align:center;padding:2rem;color:var(--qa-text-secondary);'
    empty.textContent = 'No marks found for this filter.'
    list.appendChild(empty)
  } else {
    filteredData.forEach(surah => {
      const group = document.createElement('div')
      group.style.cssText = 'margin-bottom:1.5rem;'

      const surahTitle = document.createElement('h3')
      surahTitle.className = 'qa-surah-meta'
      surahTitle.style.cssText = 'text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem;'
      surahTitle.textContent = surah.surah
      group.appendChild(surahTitle)

      surah.verses.forEach(v => {
        const card = document.createElement('div')
        card.className = 'qa-verse'
        card.style.cssText = 'padding:0.75rem;border:1px solid var(--qa-border);border-radius:8px;margin-bottom:0.5rem;'

        const ref = document.createElement('div')
        ref.style.cssText = 'font-size:0.7rem;color:var(--qa-text-secondary);margin-bottom:0.25rem;'
        ref.textContent = v.key

        const ar = document.createElement('div')
        ar.className = 'qa-verse-arabic'
        ar.style.cssText = 'font-size:1.1rem;margin-bottom:0.25rem;'
        ar.textContent = v.ar

        const en = document.createElement('div')
        en.className = 'qa-verse-translation'
        en.style.cssText = 'margin-bottom:0.5rem;border-top:none;padding-top:0;'
        en.textContent = v.en

        const tagRow = document.createElement('div')
        tagRow.style.cssText = 'display:flex;gap:0.25rem;'
        v.tags.forEach(t => {
          const badge = document.createElement('span')
          const c = tagColors[t] || 'var(--qa-accent)'
          badge.style.cssText = `padding:0.125rem 0.5rem;background:${c}20;color:${c};border-radius:999px;font-size:0.7rem;text-transform:capitalize;`
          badge.textContent = t
          tagRow.appendChild(badge)
        })

        card.appendChild(ref)
        card.appendChild(ar)
        card.appendChild(en)
        card.appendChild(tagRow)
        group.appendChild(card)
      })

      list.appendChild(group)
    })
  }

  container.appendChild(list)
  mainContent.appendChild(container)

  return document.getElementById('app-shell')
}

/** All marks */
export const AllMarks = {
  args: { filter: 'all' },
  render: (args) => renderReviewHub(args.filter),
}

/** Favourite only */
export const FavouriteOnly = {
  args: { filter: 'favourite' },
  render: (args) => renderReviewHub(args.filter),
}

/** Study only */
export const StudyOnly = {
  args: { filter: 'study' },
  render: (args) => renderReviewHub(args.filter),
}
