/**
 * Settings popover panel: theme, translation toggle, font size.
 * Injects a gear button into #top-bar; panel opens anchored to the gear.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { getThemeOptions, setTheme, loadTheme } from './theme.js'
import { getFontSizeOptions, setFontSize, loadFontSize } from './font-size.js'
import { logger } from '../core/logger.js'

let gearBtn = null
let panel = null
let backdrop = null
let isOpen = false
let outsideHandler = null
let escapeHandler = null

export async function initSettingsPanel() {
  renderGearButton()
  return destroy
}

export function destroy() {
  if (gearBtn && gearBtn.parentNode) { gearBtn.remove() }
  closePanel()
  gearBtn = null
}

function renderGearButton() {
  const topBar = document.getElementById('top-bar')
  if (!topBar) { return }
  const existing = topBar.querySelector('.qa-settings-gear')
  if (existing) { existing.remove() }

  const btn = document.createElement('button')
  btn.className = 'qa-settings-gear'
  btn.type = 'button'
  btn.setAttribute('aria-label', 'Settings')
  btn.setAttribute('aria-expanded', 'false')
  btn.setAttribute('aria-controls', 'qa-settings-panel')
  btn.textContent = '\u2699' // gear unicode
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (isOpen) { closePanel() } else { openPanel() }
  })
  topBar.appendChild(btn)
  gearBtn = btn
}

async function openPanel() {
  if (isOpen) { return }
  isOpen = true
  gearBtn?.setAttribute('aria-expanded', 'true')

  const [currentTheme, currentFont, translationVisibleSetting] = await Promise.all([
    loadTheme(),
    loadFontSize(),
    get('settings', 'translationVisible').then(r => r?.value ?? true),
  ])

  backdrop = document.createElement('div')
  backdrop.className = 'qa-settings-backdrop'
  document.body.appendChild(backdrop)

  panel = document.createElement('div')
  panel.id = 'qa-settings-panel'
  panel.className = 'qa-settings-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Settings')

  panel.appendChild(buildThemeSection(currentTheme))
  panel.appendChild(buildTranslationSection(translationVisibleSetting))
  panel.appendChild(buildFontSection(currentFont))

  document.body.appendChild(panel)

  outsideHandler = (e) => {
    if (!panel) { return }
    if (panel.contains(e.target) || gearBtn?.contains(e.target)) { return }
    closePanel()
  }
  escapeHandler = (e) => { if (e.key === 'Escape') { closePanel() } }
  setTimeout(() => {
    document.addEventListener('mousedown', outsideHandler)
    document.addEventListener('touchstart', outsideHandler, { passive: true })
  }, 0)
  document.addEventListener('keydown', escapeHandler)
}

function closePanel() {
  if (!isOpen) { return }
  isOpen = false
  gearBtn?.setAttribute('aria-expanded', 'false')
  if (panel && panel.parentNode) { panel.remove() }
  if (backdrop && backdrop.parentNode) { backdrop.remove() }
  panel = null
  backdrop = null
  if (outsideHandler) {
    document.removeEventListener('mousedown', outsideHandler)
    document.removeEventListener('touchstart', outsideHandler)
    outsideHandler = null
  }
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
    escapeHandler = null
  }
}

function buildThemeSection(current) {
  const section = document.createElement('div')
  section.className = 'qa-settings-section'
  const h = document.createElement('div')
  h.className = 'qa-settings-heading'
  h.textContent = 'Theme'
  section.appendChild(h)

  const group = document.createElement('div')
  group.className = 'qa-settings-options'
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', 'Theme')

  for (const opt of getThemeOptions()) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'qa-settings-option'
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', String(opt === current))
    if (opt === current) { btn.classList.add('qa-settings-option-active') }
    btn.textContent = opt.charAt(0).toUpperCase() + opt.slice(1)
    btn.addEventListener('click', async () => {
      await setTheme(opt)
      for (const b of group.querySelectorAll('.qa-settings-option')) {
        const isActive = b === btn
        b.classList.toggle('qa-settings-option-active', isActive)
        b.setAttribute('aria-checked', String(isActive))
      }
    })
    group.appendChild(btn)
  }
  section.appendChild(group)
  return section
}

function buildTranslationSection(current) {
  const section = document.createElement('div')
  section.className = 'qa-settings-section'
  const row = document.createElement('div')
  row.className = 'qa-settings-row'

  const text = document.createElement('span')
  text.className = 'qa-settings-heading'
  text.textContent = 'Show translation'

  const sw = document.createElement('button')
  sw.type = 'button'
  sw.className = 'qa-settings-switch'
  sw.setAttribute('role', 'switch')
  sw.setAttribute('aria-checked', String(!!current))
  sw.setAttribute('aria-label', 'Toggle translation')
  sw.classList.toggle('qa-settings-switch-on', !!current)
  const handle = document.createElement('span')
  handle.className = 'qa-settings-switch-handle'
  sw.appendChild(handle)

  sw.addEventListener('click', async () => {
    const next = sw.getAttribute('aria-checked') !== 'true'
    sw.setAttribute('aria-checked', String(next))
    sw.classList.toggle('qa-settings-switch-on', next)
    try {
      await put('settings', { key: 'translationVisible', value: next })
      emit(Events.SETTINGS_TRANSLATION_CHANGED, { visible: next })
      applyTranslationToDOM(next)
    } catch (error) {
      logger.error('Failed to save translation setting', { error })
    }
  })

  row.appendChild(text)
  row.appendChild(sw)
  section.appendChild(row)
  return section
}

function applyTranslationToDOM(visible) {
  const translations = document.querySelectorAll('[data-translation]')
  translations.forEach(el => {
    if (visible) { el.classList.remove('qa-hide-translation') }
    else { el.classList.add('qa-hide-translation') }
  })
}

function buildFontSection(current) {
  const section = document.createElement('div')
  section.className = 'qa-settings-section'
  const h = document.createElement('div')
  h.className = 'qa-settings-heading'
  h.textContent = 'Font size'
  section.appendChild(h)

  const group = document.createElement('div')
  group.className = 'qa-settings-options'
  group.setAttribute('role', 'radiogroup')
  group.setAttribute('aria-label', 'Font size')

  for (const opt of getFontSizeOptions()) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'qa-settings-option'
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', String(opt === current))
    if (opt === current) { btn.classList.add('qa-settings-option-active') }
    btn.textContent = opt.charAt(0).toUpperCase() + opt.slice(1)
    btn.addEventListener('click', async () => {
      await setFontSize(opt)
      for (const b of group.querySelectorAll('.qa-settings-option')) {
        const isActive = b === btn
        b.classList.toggle('qa-settings-option-active', isActive)
        b.setAttribute('aria-checked', String(isActive))
      }
    })
    group.appendChild(btn)
  }
  section.appendChild(group)
  return section
}
