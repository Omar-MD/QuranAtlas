/**
 * About page.
 * Shows wordmark, blessing 54:17, 2×2 stat grid, attribution, PWA install, version.
 */

import { getAll } from '../marks/store.js'
import { announce } from '../a11y/announcer.js'
import { getInstallPrompt, promptInstall } from './pwa-install.js'

let _initSeq = 0

/**
 * Initialize the about page.
 */
export async function init() {
  const seq = ++_initSeq

  const mainContent = document.getElementById('main-content')
  if (!mainContent) { return }

  while (mainContent.firstChild) { mainContent.removeChild(mainContent.firstChild) }

  // Wordmark + mission
  const heading = document.createElement('h1')
  heading.className = 'qa-about-heading'
  heading.textContent = 'QuranAtlas'
  mainContent.appendChild(heading)

  const mission = document.createElement('p')
  mission.className = 'qa-about-mission'
  mission.textContent = 'Read, reflect, remember.'
  mainContent.appendChild(mission)

  // Blessing — 54:17
  const blessingWrap = document.createElement('div')
  blessingWrap.className = 'qa-about-blessing-wrap'

  const blessing = document.createElement('p')
  blessing.className = 'qa-about-blessing'
  blessing.setAttribute('dir', 'rtl')
  blessing.setAttribute('lang', 'ar')
  blessing.textContent = 'وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٍ'
  blessingWrap.appendChild(blessing)

  const blessingTrans = document.createElement('p')
  blessingTrans.className = 'qa-about-blessing-translation'
  blessingTrans.textContent = '"And We have certainly made the Qur\'an easy for remembrance, so is there any who will remember?" — 54:17'
  blessingWrap.appendChild(blessingTrans)

  mainContent.appendChild(blessingWrap)

  // Stat grid — render placeholder cells immediately
  const grid = document.createElement('div')
  grid.className = 'qa-about-stat-grid'
  mainContent.appendChild(grid)

  const statDefs = [
    { label: 'Marks',     value: '—' },
    { label: 'Tags',      value: '—' },
    { label: 'Surahs',    value: '—' },
    { label: '% Qur\'an', value: '—' },
  ]
  for (const def of statDefs) {
    const cell = document.createElement('div')
    cell.className = 'qa-about-stat-cell'
    const val = document.createElement('span')
    val.className = 'qa-about-stat-value'
    val.textContent = def.value
    const label = document.createElement('span')
    label.className = 'qa-about-stat-label'
    label.textContent = def.label
    cell.appendChild(val)
    cell.appendChild(label)
    grid.appendChild(cell)
  }

  // Load marks and populate stats
  try {
    const marks = await getAll()
    if (seq !== _initSeq) { return }

    const totalMarks = marks.length
    const uniqueTags = new Set(marks.flatMap(m => m.tags)).size
    const uniqueSurahs = new Set(marks.map(m => parseInt(m.verseKey.split(':')[0], 10))).size
    const pctTagged = ((totalMarks / 6236) * 100).toFixed(2)

    const cells = grid.querySelectorAll('.qa-about-stat-cell')
    const values = [String(totalMarks), String(uniqueTags), String(uniqueSurahs), `${pctTagged}%`]
    cells.forEach((cell, i) => {
      cell.querySelector('.qa-about-stat-value').textContent = values[i]
    })
  } catch {
    // Stats unavailable — leave as '—'
  }

  // Attribution
  const attrSection = document.createElement('section')
  attrSection.className = 'qa-about-attribution'

  const attrTitle = document.createElement('h2')
  attrTitle.className = 'qa-about-section-title'
  attrTitle.textContent = 'Attribution'
  attrSection.appendChild(attrTitle)

  const attrList = document.createElement('ul')
  attrList.className = 'qa-about-attr-list'

  const credits = [
    'Quran translation by Fadel Soliman (Bridges\' Translation)',
    'Arabic typography by KFGQPC (King Fahd Glyphic and Typographic Project)',
    'Font: Scheherazade New (SIL Open Font License)',
    'Built with Vite, Lightning CSS, Workbox',
  ]

  for (const credit of credits) {
    const li = document.createElement('li')
    li.textContent = credit
    attrList.appendChild(li)
  }

  attrSection.appendChild(attrList)
  mainContent.appendChild(attrSection)

  // PWA Install
  renderInstallButton(mainContent)

  // Version (simplified)
  const versionLine = document.createElement('p')
  versionLine.className = 'qa-about-version-line'
  versionLine.textContent = `v${typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'}`
  mainContent.appendChild(versionLine)

  announce('About page')

  return () => { ++_initSeq }
}

/**
 * Render PWA install button if prompt is available.
 * @param {HTMLElement} container
 */
function renderInstallButton(container) {
  const prompt = getInstallPrompt()
  if (!prompt) { return }

  const section = document.createElement('section')
  section.className = 'qa-about-install'

  const btn = document.createElement('button')
  btn.className = 'qa-btn qa-btn-primary qa-about-install-btn'
  btn.textContent = 'Install App'
  btn.setAttribute('aria-label', 'Install QuranAtlas to your home screen')
  btn.addEventListener('click', async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') {
      btn.textContent = 'Installed!'
      btn.disabled = true
      announce('App installed')
    }
  })

  section.appendChild(btn)
  container.appendChild(section)
}
