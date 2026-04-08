/**
 * Settings page.
 * Renders theme switcher and clear-data button into #main-content.
 */

import { loadTheme, setTheme, getThemeOptions } from './theme.js'
import { showClearDataConfirmation } from './clear-data.js'
import { announce } from '../a11y/announcer.js'

let _initSeq = 0

const SWATCH_LABELS = {
  light: 'Light',
  dark: 'Dark',
  sepia: 'Sepia',
}

/**
 * Initialize the settings page.
 */
export async function init() {
  const seq = ++_initSeq

  const mainContent = document.getElementById('main-content')
  if (!mainContent) { return }

  while (mainContent.firstChild) { mainContent.removeChild(mainContent.firstChild) }

  const currentTheme = await loadTheme()

  if (seq !== _initSeq) { return }

  // Page heading
  const heading = document.createElement('h1')
  heading.className = 'qa-settings-heading'
  heading.textContent = 'Settings'
  mainContent.appendChild(heading)

  // Theme section
  const themeSection = document.createElement('section')
  themeSection.className = 'qa-settings-theme'

  const themeLabel = document.createElement('h2')
  themeLabel.className = 'qa-settings-section-title'
  themeLabel.textContent = 'Theme'
  themeSection.appendChild(themeLabel)

  const swatchRow = document.createElement('div')
  swatchRow.className = 'qa-settings-swatch-row'
  swatchRow.setAttribute('role', 'radiogroup')
  swatchRow.setAttribute('aria-label', 'Choose theme')

  for (const theme of getThemeOptions()) {
    const swatch = document.createElement('button')
    swatch.className = 'qa-settings-swatch'
    swatch.setAttribute('data-theme', theme)
    swatch.setAttribute('role', 'radio')
    swatch.setAttribute('aria-checked', theme === currentTheme ? 'true' : 'false')
    swatch.setAttribute('aria-pressed', theme === currentTheme ? 'true' : 'false')
    swatch.setAttribute('aria-label', `${SWATCH_LABELS[theme]} theme`)

    const preview = document.createElement('span')
    preview.className = `qa-settings-swatch-preview qa-settings-swatch-preview--${theme}`
    swatch.appendChild(preview)

    const label = document.createElement('span')
    label.className = 'qa-settings-swatch-label'
    label.textContent = SWATCH_LABELS[theme]
    swatch.appendChild(label)

    swatch.addEventListener('click', async () => {
      const success = await setTheme(theme)
      if (success) {
        const allSwatches = swatchRow.querySelectorAll('.qa-settings-swatch')
        for (const s of allSwatches) {
          const isActive = s.getAttribute('data-theme') === theme
          s.setAttribute('aria-pressed', isActive ? 'true' : 'false')
          s.setAttribute('aria-checked', isActive ? 'true' : 'false')
        }
        announce(`Theme changed to ${SWATCH_LABELS[theme]}`)
      }
    })

    swatchRow.appendChild(swatch)
  }

  themeSection.appendChild(swatchRow)
  mainContent.appendChild(themeSection)

  // Clear data section
  const clearSection = document.createElement('section')
  clearSection.className = 'qa-settings-clear'

  const clearLabel = document.createElement('h2')
  clearLabel.className = 'qa-settings-section-title'
  clearLabel.textContent = 'Data'
  clearSection.appendChild(clearLabel)

  const clearDesc = document.createElement('p')
  clearDesc.className = 'qa-settings-clear-desc'
  clearDesc.textContent = 'Remove all reading positions, marks, settings, and cached data. This cannot be undone.'
  clearSection.appendChild(clearDesc)

  const clearBtn = document.createElement('button')
  clearBtn.className = 'qa-btn qa-btn-danger qa-settings-clear-btn'
  clearBtn.textContent = 'Clear All Data'
  clearBtn.setAttribute('aria-label', 'Clear all data and reset to defaults')
  clearBtn.addEventListener('click', () => {
    showClearDataConfirmation()
  })
  clearSection.appendChild(clearBtn)
  mainContent.appendChild(clearSection)

  // About link
  const aboutLink = document.createElement('a')
  aboutLink.className = 'qa-settings-about-link'
  aboutLink.href = '#/about'
  aboutLink.textContent = 'About QuranAtlas'
  mainContent.appendChild(aboutLink)

  announce('Settings page')
}

/**
 * Invalidates any in-flight init() call.
 * Called by the router before navigating away from this page.
 */
export function cleanup() {
  ++_initSeq
}
