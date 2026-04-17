/**
 * Settings bottom sheet — opened from the "More" sheet or #/settings route.
 * Sections: Theme (4 swatches incl. Auto) · Font size slider + live preview ·
 * Reading toggles (translation on/off + translation picker link).
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { getThemeOptions, setTheme, loadTheme, getAppliedVariants } from './theme.js'
import { getFontSizeOptions, setFontSize, loadFontSize } from './font-size.js'
import { logger } from '../core/logger.js'

const TRANSLATION_OPTIONS = [
  { id: 'saheeh',    name: 'Saheeh International', sub: 'English · clear, modern' },
  { id: 'pickthall', name: 'Pickthall',            sub: 'English · classical prose' },
  { id: 'yusuf',     name: 'Yusuf Ali',            sub: 'English · with commentary' },
  { id: 'khattab',   name: 'Clear Qur\u2019an (Khattab)', sub: 'English · contemporary' },
]

let scrim = null
let sheet = null
let escHandler = null
let currentView = 'main'

export async function initSettingsPanel() {
  // No gear button — Settings opens from the "More" sheet or #/settings route.
  return () => { closeSettingsSheet() }
}

export function openSettingsSheet() {
  if (sheet) { return }
  currentView = 'main'

  scrim = document.createElement('div')
  scrim.className = 'qa-sheet-backdrop'
  scrim.addEventListener('click', closeSettingsSheet)

  sheet = document.createElement('div')
  sheet.className = 'qa-sheet qa-sheet--bottom qa-sheet--settings'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Settings')

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  escHandler = (e) => { if (e.key === 'Escape') { closeSettingsSheet() } }
  document.addEventListener('keydown', escHandler)

  renderMain()
  emit(Events.SHEET_OPENED, { name: 'settings' })
}

export function closeSettingsSheet() {
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null }
  if (sheet?.parentNode) { sheet.parentNode.removeChild(sheet) }
  if (scrim?.parentNode) { scrim.parentNode.removeChild(scrim) }
  sheet = null
  scrim = null
  emit(Events.SHEET_CLOSED, { name: 'settings' })
}

async function renderMain() {
  if (!sheet) { return }
  while (sheet.firstChild) { sheet.removeChild(sheet.firstChild) }
  currentView = 'main'

  const grip = document.createElement('div')
  grip.className = 'qa-sheet-grip'
  grip.setAttribute('aria-hidden', 'true')

  const hdr = document.createElement('div')
  hdr.className = 'qa-sheet-hdr'
  const title = document.createElement('div')
  title.className = 'qa-sheet-title'
  title.textContent = 'Settings'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'qa-sheet-close'
  close.setAttribute('aria-label', 'Close')
  close.textContent = '\u2715'
  close.addEventListener('click', closeSettingsSheet)
  hdr.appendChild(title)
  hdr.appendChild(close)

  const body = document.createElement('div')
  body.className = 'qa-sheet-body qa-settings-body'

  const [currentTheme, currentFont, translationVisible, translationId] = await Promise.all([
    loadTheme(),
    loadFontSize(),
    get('settings', 'translationVisible').then(r => r?.value ?? true),
    get('settings', 'translationId').then(r => r?.value ?? 'saheeh'),
  ])

  body.appendChild(buildThemeSection(currentTheme))
  body.appendChild(buildFontSection(currentFont))
  body.appendChild(buildReadingSection(translationVisible, translationId))

  sheet.appendChild(grip)
  sheet.appendChild(hdr)
  sheet.appendChild(body)
}

function buildThemeSection(currentTheme) {
  const section = document.createElement('section')
  section.className = 'qa-settings-section'
  const label = document.createElement('div')
  label.className = 'qa-settings-label'
  label.textContent = 'Theme'
  section.appendChild(label)

  const row = document.createElement('div')
  row.className = 'qa-theme-row'
  row.setAttribute('role', 'radiogroup')
  row.setAttribute('aria-label', 'Theme')

  for (const opt of getThemeOptions()) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `qa-theme-swatch qa-theme-swatch--${opt}`
    btn.setAttribute('role', 'radio')
    btn.setAttribute('aria-checked', String(opt === currentTheme))
    if (opt === currentTheme) { btn.classList.add('qa-theme-swatch--active') }
    const preview = document.createElement('span')
    preview.className = 'qa-theme-swatch-preview'
    preview.setAttribute('aria-hidden', 'true')
    const inner = document.createElement('span')
    inner.className = 'qa-theme-swatch-inner'
    inner.textContent = '\u0627\u0644\u0644\u0647' // الله
    preview.appendChild(inner)
    const txt = document.createElement('span')
    txt.className = 'qa-theme-swatch-label'
    txt.textContent = opt.charAt(0).toUpperCase() + opt.slice(1)
    btn.appendChild(preview)
    btn.appendChild(txt)
    btn.addEventListener('click', async () => {
      await setTheme(opt)
      for (const b of row.querySelectorAll('.qa-theme-swatch')) {
        const on = b === btn
        b.classList.toggle('qa-theme-swatch--active', on)
        b.setAttribute('aria-checked', String(on))
      }
    })
    row.appendChild(btn)
  }
  section.appendChild(row)
  return section
}

function buildFontSection(currentFont) {
  const section = document.createElement('section')
  section.className = 'qa-settings-section'
  const label = document.createElement('div')
  label.className = 'qa-settings-label'
  label.textContent = 'Font size'
  section.appendChild(label)

  const order = getFontSizeOptions()

  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'qa-font-slider'
  slider.min = '0'
  slider.max = String(order.length - 1)
  slider.step = '1'
  slider.value = String(order.indexOf(currentFont))
  slider.setAttribute('aria-label', 'Font size')

  const preview = document.createElement('div')
  preview.className = 'qa-font-preview'
  const arSpan = document.createElement('span')
  arSpan.className = 'qa-font-preview-ar'
  arSpan.setAttribute('dir', 'rtl')
  arSpan.textContent = '\u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650' // ٱلرَّحْمَـٰنِ
  const enSpan = document.createElement('span')
  enSpan.className = 'qa-font-preview-en'
  enSpan.textContent = ' \u00B7 The Most Gracious'
  preview.appendChild(arSpan)
  preview.appendChild(enSpan)

  slider.addEventListener('input', async () => {
    const idx = parseInt(slider.value, 10)
    const size = order[Math.max(0, Math.min(order.length - 1, idx))]
    await setFontSize(size)
  })

  const wrap = document.createElement('div')
  wrap.className = 'qa-font-wrap'
  const minL = document.createElement('span')
  minL.className = 'qa-font-min'
  minL.textContent = 'Aa'
  const maxL = document.createElement('span')
  maxL.className = 'qa-font-max'
  maxL.textContent = 'Aa'
  wrap.appendChild(minL)
  wrap.appendChild(slider)
  wrap.appendChild(maxL)

  section.appendChild(wrap)
  section.appendChild(preview)
  return section
}

function buildReadingSection(visible, translationId) {
  const section = document.createElement('section')
  section.className = 'qa-settings-section'
  const label = document.createElement('div')
  label.className = 'qa-settings-label'
  label.textContent = 'Reading'
  section.appendChild(label)

  section.appendChild(buildToggleRow({
    main: 'Show translation',
    sub: TRANSLATION_OPTIONS.find(o => o.id === translationId)?.name || 'English',
    on: visible,
    onToggle: async (next) => {
      try {
        await put('settings', { key: 'translationVisible', value: next })
        emit(Events.SETTINGS_TRANSLATION_CHANGED, { visible: next })
        applyTranslationToDOM(next)
      } catch (error) {
        logger.error('Failed to save translation setting', { error })
      }
    },
    onTapSub: () => { renderTranslationPicker() },
  }))

  return section
}

function buildToggleRow({ main, sub, on, onToggle, onTapSub }) {
  const row = document.createElement('div')
  row.className = 'qa-settings-toggle-row'

  const body = document.createElement('button')
  body.type = 'button'
  body.className = 'qa-settings-toggle-body'
  body.addEventListener('click', onTapSub || (() => {}))
  const m = document.createElement('div')
  m.className = 'qa-settings-toggle-main'
  m.textContent = main
  const s = document.createElement('div')
  s.className = 'qa-settings-toggle-sub'
  s.textContent = sub
  body.appendChild(m)
  body.appendChild(s)

  const sw = document.createElement('button')
  sw.type = 'button'
  sw.className = 'qa-settings-switch'
  sw.setAttribute('role', 'switch')
  sw.setAttribute('aria-checked', String(!!on))
  sw.classList.toggle('qa-settings-switch--on', !!on)
  const knob = document.createElement('span')
  knob.className = 'qa-settings-switch-knob'
  sw.appendChild(knob)
  sw.addEventListener('click', async () => {
    const next = sw.getAttribute('aria-checked') !== 'true'
    sw.setAttribute('aria-checked', String(next))
    sw.classList.toggle('qa-settings-switch--on', next)
    await onToggle(next)
  })

  row.appendChild(body)
  row.appendChild(sw)
  return row
}

function applyTranslationToDOM(visible) {
  const translations = document.querySelectorAll('[data-translation]')
  translations.forEach(el => {
    if (visible) { el.classList.remove('qa-hide-translation') }
    else { el.classList.add('qa-hide-translation') }
  })
}

async function renderTranslationPicker() {
  if (!sheet) { return }
  while (sheet.firstChild) { sheet.removeChild(sheet.firstChild) }
  currentView = 'translation'

  const grip = document.createElement('div')
  grip.className = 'qa-sheet-grip'
  grip.setAttribute('aria-hidden', 'true')

  const hdr = document.createElement('div')
  hdr.className = 'qa-sheet-hdr'
  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'qa-sheet-back'
  back.setAttribute('aria-label', 'Back')
  back.textContent = '\u2190 Translation'
  back.addEventListener('click', renderMain)
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'qa-sheet-close'
  close.setAttribute('aria-label', 'Close')
  close.textContent = '\u2715'
  close.addEventListener('click', closeSettingsSheet)
  hdr.appendChild(back)
  hdr.appendChild(close)

  const body = document.createElement('div')
  body.className = 'qa-sheet-body'

  const current = (await get('settings', 'translationId'))?.value || 'saheeh'

  for (const opt of TRANSLATION_OPTIONS) {
    const row = document.createElement('button')
    row.type = 'button'
    row.className = 'qa-settings-trans-choice'
    if (opt.id === current) { row.classList.add('qa-settings-trans-choice--on') }
    const col = document.createElement('span')
    col.className = 'qa-settings-trans-body'
    const name = document.createElement('span')
    name.className = 'qa-settings-trans-name'
    name.textContent = opt.name
    const sub = document.createElement('span')
    sub.className = 'qa-settings-trans-sub'
    sub.textContent = opt.sub
    col.appendChild(name)
    col.appendChild(sub)
    const check = document.createElement('span')
    check.className = 'qa-settings-trans-check'
    check.setAttribute('aria-hidden', 'true')
    check.textContent = '\u2713'
    row.appendChild(col)
    row.appendChild(check)
    row.addEventListener('click', async () => {
      try {
        await put('settings', { key: 'translationId', value: opt.id })
      } catch (error) {
        logger.error('Failed to save translation choice', { error })
      }
      renderMain()
    })
    body.appendChild(row)
  }

  sheet.appendChild(grip)
  sheet.appendChild(hdr)
  sheet.appendChild(body)
}
