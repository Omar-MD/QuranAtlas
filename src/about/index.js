/**
 * About page.
 * Shows app info, versions, attribution, storage, and PWA install.
 */

import { get } from '../core/db.js'
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

  // Heading + mission
  const heading = document.createElement('h1')
  heading.className = 'qa-about-heading'
  heading.textContent = 'QuranAtlas'
  mainContent.appendChild(heading)

  const mission = document.createElement('p')
  mission.className = 'qa-about-mission'
  mission.textContent = 'Read, reflect, remember.'
  mainContent.appendChild(mission)

  // Versions section
  const versionsSection = document.createElement('section')
  versionsSection.className = 'qa-about-versions'

  const versionsTitle = document.createElement('h2')
  versionsTitle.className = 'qa-about-section-title'
  versionsTitle.textContent = 'Versions'
  versionsSection.appendChild(versionsTitle)

  const dl = document.createElement('dl')
  dl.className = 'qa-about-dl'

  // App version
  const appDt = document.createElement('dt')
  appDt.textContent = 'App'
  const appDd = document.createElement('dd')
  appDd.className = 'qa-about-app-version'
  appDd.textContent = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'
  dl.appendChild(appDt)
  dl.appendChild(appDd)

  // Dataset version
  const dsDt = document.createElement('dt')
  dsDt.textContent = 'Dataset'
  const dsDd = document.createElement('dd')
  dsDd.className = 'qa-about-dataset-version'
  let dsVersion = 'Not yet installed'
  try {
    const meta = await get('datasetMeta', 'current')
    if (meta?.version) dsVersion = meta.version
  } catch { /* IDB unavailable, show fallback */ }

  if (seq !== _initSeq) { return }

  dsDd.textContent = dsVersion
  dl.appendChild(dsDt)
  dl.appendChild(dsDd)

  versionsSection.appendChild(dl)
  mainContent.appendChild(versionsSection)

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

  // Storage
  await renderStorage(mainContent, () => seq !== _initSeq)

  if (seq !== _initSeq) { return }

  // PWA Install
  renderInstallButton(mainContent)

  // Back to Settings link
  const backLink = document.createElement('a')
  backLink.className = 'qa-about-back-link'
  backLink.href = '#/settings'
  backLink.textContent = '\u2190 Settings'
  mainContent.appendChild(backLink)

  announce('About page')
}

/**
 * Invalidates any in-flight init() call.
 * Called by the router before navigating away from this page.
 */
export function cleanup() {
  ++_initSeq
}

/**
 * Render storage meter section.
 * @param {HTMLElement} container
 * @param {() => boolean} isCancelled
 */
async function renderStorage(container, isCancelled) {
  const section = document.createElement('section')
  section.className = 'qa-about-storage'

  const title = document.createElement('h2')
  title.className = 'qa-about-section-title'
  title.textContent = 'Storage'
  section.appendChild(title)

  if (!navigator.storage?.estimate) {
    const fallback = document.createElement('p')
    fallback.textContent = 'Storage info not available in this browser.'
    section.appendChild(fallback)
    container.appendChild(section)
    return
  }

  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (isCancelled()) { return }
    const percent = quota ? (usage / quota) * 100 : 0

    const meter = document.createElement('meter')
    meter.className = 'qa-about-storage-meter'
    meter.value = usage
    meter.max = quota
    meter.setAttribute('aria-label', 'Storage usage')
    section.appendChild(meter)

    const text = document.createElement('p')
    text.className = 'qa-about-storage-text'
    const usageMB = (usage / (1024 * 1024)).toFixed(1)
    const quotaMB = (quota / (1024 * 1024)).toFixed(0)
    text.textContent = `${usageMB} MB of ${quotaMB} MB used (${percent.toFixed(0)}%)`
    section.appendChild(text)

    if (percent > 80) {
      const warning = document.createElement('p')
      warning.className = 'qa-about-storage-warning'
      warning.textContent = 'Storage is running low. Consider clearing data in Settings.'
      section.appendChild(warning)
    }
  } catch {
    const fallback = document.createElement('p')
    fallback.textContent = 'Could not read storage estimate.'
    section.appendChild(fallback)
  }

  container.appendChild(section)
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

