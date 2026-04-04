/**
 * Reader route handler.
 * Renders surah content with Arabic text, translation, and basmala rules.
 */

import { getSurah, getSurahs } from '../data/dataset.js'
import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'

const SKELETON_TIMEOUT_MS = 5000

/**
 * Initialize the reader for a surah.
 * @param {object} params
 * @param {string} params.surah - Surah number
 * @param {string} [params.ayah] - Specific verse (deep link)
 */
export async function init(params) {
  const surahNum = parseInt(params.surah, 10)
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) return

  const mainContent = document.getElementById('main-content')
  const topBar = document.getElementById('top-bar')
  if (!mainContent) return

  // Show skeleton
  showSkeleton(mainContent)

  // Set 5s hard timeout
  const timeout = setTimeout(() => {
    showError(mainContent, surahNum)
  }, SKELETON_TIMEOUT_MS)

  try {
    const [surah, surahs, translationVisible] = await Promise.all([
      getSurah(surahNum),
      getSurahs(),
      get('settings', 'translationVisible').then(r => r?.value ?? true),
    ])

    clearTimeout(timeout)

    const surahMeta = surahs.find(s => s.n === surahNum)

    // Render
    mainContent.innerHTML = ''
    renderSurahHeader(mainContent, surahMeta)
    renderBasmala(mainContent, surahNum)
    renderVerses(mainContent, surah, translationVisible)

    // Render top bar controls
    renderTopBar(topBar, translationVisible, surahNum)

    emit('reader:surah-loaded', { surah: surahNum })
  } catch (error) {
    clearTimeout(timeout)
    showError(mainContent, surahNum, error.message)
  }
}

/**
 * Show skeleton loader.
 */
function showSkeleton(container) {
  container.innerHTML = ''
  for (let i = 0; i < 6; i++) {
    const line = document.createElement('div')
    line.className = 'qa-skeleton qa-skeleton-line'
    line.style.width = i % 2 === 0 ? '100%' : '80%'
    container.appendChild(line)
  }
}

/**
 * Show error state.
 */
function showError(container, surahNum, message) {
  container.innerHTML = ''
  const errorDiv = document.createElement('div')
  errorDiv.style.textAlign = 'center'
  errorDiv.style.padding = '2rem 1rem'
  errorDiv.textContent = `Failed to load Surah ${surahNum}.`

  const retryBtn = document.createElement('button')
  retryBtn.textContent = 'Retry'
  retryBtn.style.marginTop = '0.5rem'
  retryBtn.style.cursor = 'pointer'
  retryBtn.addEventListener('click', () => init({ surah: String(surahNum) }))
  errorDiv.appendChild(document.createElement('br'))
  errorDiv.appendChild(retryBtn)

  container.appendChild(errorDiv)
}

/**
 * Render surah header.
 */
function renderSurahHeader(container, meta) {
  const header = document.createElement('div')
  header.setAttribute('data-surah-header', '')

  const nameEl = document.createElement('div')
  nameEl.className = 'qa-surah-name'
  nameEl.textContent = meta?.arabic ?? ''

  const metaEl = document.createElement('div')
  metaEl.className = 'qa-surah-meta'
  metaEl.textContent = `${meta?.name ?? ''} · Surah ${meta?.n ?? ''} · ${meta?.count ?? ''} verses · ${meta?.type ?? ''}`

  header.appendChild(nameEl)
  header.appendChild(metaEl)
  container.appendChild(header)
}

/**
 * Render basmala according to rules:
 * - Surah 1 (Al-Fatiha): basmala is verse 1:1, don't render separately
 * - Surah 9 (At-Tawbah): no basmala
 * - Surahs 2-113 (except 9): basmala as decorative prefix
 */
function renderBasmala(container, surahNum) {
  if (surahNum === 1 || surahNum === 9) return

  const basmala = document.createElement('div')
  basmala.className = 'qa-basmala'
  basmala.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
  container.appendChild(basmala)
}

/**
 * Render verses.
 * CRITICAL: Arabic text set via textContent only — never innerHTML.
 */
function renderVerses(container, surah, translationVisible) {
  const startIndex = surah.ar.length > 1 ? 0 : 0

  for (let i = startIndex; i < surah.ar.length; i++) {
    const verseNum = i + 1
    const verseBlock = document.createElement('div')
    verseBlock.className = 'qa-verse'
    verseBlock.setAttribute('data-verse', `${verseNum}`)

    const arabicEl = document.createElement('div')
    arabicEl.className = 'qa-verse-arabic'
    arabicEl.setAttribute('dir', 'rtl')
    // CRITICAL: textContent, never innerHTML
    arabicEl.textContent = surah.ar[i]

    const numberEl = document.createElement('span')
    numberEl.className = 'qa-verse-number'
    numberEl.textContent = String(verseNum)

    arabicEl.insertBefore(numberEl, arabicEl.firstChild)
    verseBlock.appendChild(arabicEl)

    if (translationVisible) {
      const transEl = document.createElement('div')
      transEl.className = 'qa-verse-translation'
      transEl.setAttribute('data-translation', '')
      transEl.textContent = surah.en[i]
      verseBlock.appendChild(transEl)
    }

    container.appendChild(verseBlock)
  }
}

/**
 * Render top bar with translation toggle.
 */
function renderTopBar(topBar, translationVisible, surahNum) {
  if (!topBar) return

  topBar.innerHTML = ''

  const toggleBtn = document.createElement('button')
  toggleBtn.textContent = translationVisible ? 'EN ▾' : 'EN ▸'
  toggleBtn.setAttribute('aria-label', translationVisible ? 'Hide translation' : 'Show translation')
  toggleBtn.style.cursor = 'pointer'
  toggleBtn.style.background = 'none'
  toggleBtn.style.border = '1px solid var(--qa-border)'
  toggleBtn.style.borderRadius = '4px'
  toggleBtn.style.padding = '0.25rem 0.5rem'
  toggleBtn.style.fontSize = '0.875rem'
  toggleBtn.style.color = 'var(--qa-text-secondary)'

  toggleBtn.addEventListener('click', async () => {
    const newValue = !translationVisible
    try {
      await put('settings', { key: 'translationVisible', value: newValue })
    } catch {
      // Settings save failed, continue anyway
    }
    init({ surah: String(surahNum) })
  })

  topBar.appendChild(toggleBtn)
}
