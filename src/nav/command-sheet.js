/**
 * Command sheet — ⌘K surface, single unified search/actions overlay.
 * Replaces the old hamburger drawer.
 * Subsequent tasks extend this file with query resolution and keyboard navigation.
 */

let scrim = null
let sheet = null
let input = null
let results = null
let isOpen = false
let escapeHandler = null

export async function initCommandSheet() {
  destroyCommandSheet()

  scrim = document.createElement('div')
  scrim.className = 'qa-cmd-scrim qa-cmd--hidden'
  scrim.addEventListener('click', closeCommandSheet)

  sheet = document.createElement('div')
  sheet.className = 'qa-cmd-sheet qa-cmd--hidden'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Command sheet')

  const inputRow = document.createElement('div')
  inputRow.className = 'qa-cmd-input-row'

  const glyph = document.createElement('span')
  glyph.className = 'qa-cmd-input-glyph'
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = '\u2315'

  input = document.createElement('input')
  input.type = 'search'
  input.className = 'qa-cmd-input'
  input.setAttribute('placeholder', 'Search surah, verse, tag, or command')
  input.setAttribute('aria-label', 'Search surah, verse, tag, or command')
  input.setAttribute('autocomplete', 'off')
  input.maxLength = 50

  const hint = document.createElement('span')
  hint.className = 'qa-cmd-input-hint'
  hint.textContent = 'esc'

  inputRow.appendChild(glyph)
  inputRow.appendChild(input)
  inputRow.appendChild(hint)

  results = document.createElement('div')
  results.className = 'qa-cmd-results'
  results.setAttribute('role', 'listbox')

  sheet.appendChild(inputRow)
  sheet.appendChild(results)

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  escapeHandler = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      closeCommandSheet()
    }
  }
  document.addEventListener('keydown', escapeHandler)

  return destroyCommandSheet
}

export function openCommandSheet() {
  if (!sheet || !scrim || !input) { return }
  scrim.classList.remove('qa-cmd--hidden')
  sheet.classList.remove('qa-cmd--hidden')
  isOpen = true
  input.value = ''
  input.focus()
}

export function closeCommandSheet() {
  if (!sheet || !scrim) { return }
  scrim.classList.add('qa-cmd--hidden')
  sheet.classList.add('qa-cmd--hidden')
  isOpen = false
}

export function destroyCommandSheet() {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
    escapeHandler = null
  }
  if (scrim && scrim.parentNode) { scrim.parentNode.removeChild(scrim) }
  if (sheet && sheet.parentNode) { sheet.parentNode.removeChild(sheet) }
  scrim = null
  sheet = null
  input = null
  results = null
  isOpen = false
}
