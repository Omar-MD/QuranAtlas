/**
 * Five onboarding screens. Each renderScreen() fully builds its DOM into `wrap`.
 */

import { setTheme, loadTheme, getThemeOptions } from '../settings/theme.js'
import { put } from '../core/db.js'

export async function renderScreen(wrap, n, cb) {
  const page = document.createElement('div')
  page.className = 'qa-onb-page'
  wrap.appendChild(page)

  if (n >= 2) {
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.className = 'qa-onb-skip'
    skip.textContent = 'Skip'
    skip.addEventListener('click', cb.onSkip)
    page.appendChild(skip)
  }

  if (n === 1) { renderWelcome(page, cb) }
  else if (n === 2) { await renderTheme(page, cb) }
  else if (n === 3) { await renderTranslation(page, cb) }
  else if (n === 4) { renderShortcuts(page, cb) }
  else { renderTagsIntro(page, cb) }

  const dots = document.createElement('div')
  dots.className = 'qa-onb-dots'
  for (let i = 1; i <= cb.total; i++) {
    const dot = document.createElement('span')
    dot.className = 'qa-onb-dot' + (i === n ? ' qa-onb-dot--on' : '')
    dots.appendChild(dot)
  }
  page.appendChild(dots)
}

function renderWelcome(page, cb) {
  const hero = document.createElement('div')
  hero.className = 'qa-onb-hero'
  const mark = document.createElement('div')
  mark.className = 'qa-onb-mark'
  mark.setAttribute('dir', 'rtl')
  mark.textContent = 'القرآن أطلس'
  const tag = document.createElement('div')
  tag.className = 'qa-onb-tag'
  tag.textContent = 'Qur\u2019an Atlas'
  const blessing = document.createElement('div')
  blessing.className = 'qa-onb-blessing'
  const mission = document.createElement('div')
  mission.textContent = 'Read, reflect, remember.'
  const verse = document.createElement('div')
  verse.className = 'qa-onb-verse'
  verse.setAttribute('dir', 'rtl')
  verse.textContent = 'كِتَٰبٌ أَنزَلْنَـٰهُ إِلَيْكَ مُبَـٰرَكٌ'
  const tr = document.createElement('div')
  tr.className = 'qa-onb-verse-tr'
  tr.textContent = '"A Book We have sent down to you, blessed." — 38:29'
  blessing.appendChild(mission)
  blessing.appendChild(verse)
  blessing.appendChild(tr)
  hero.appendChild(mark)
  hero.appendChild(tag)
  hero.appendChild(blessing)
  page.appendChild(hero)

  const cta = document.createElement('button')
  cta.type = 'button'
  cta.className = 'qa-onb-cta qa-onb-cta--primary'
  cta.textContent = 'Begin'
  cta.addEventListener('click', cb.onContinue)

  const row = document.createElement('div')
  row.className = 'qa-onb-cta-row'
  row.appendChild(cta)
  page.appendChild(row)
}

async function renderTheme(page, cb) {
  const headline = document.createElement('h1')
  headline.className = 'qa-onb-headline'
  const prefix = document.createTextNode('Pick how it ')
  const gold = document.createElement('span')
  gold.className = 'qa-onb-gold'
  gold.textContent = 'feels'
  const suffix = document.createTextNode('.')
  headline.appendChild(prefix)
  headline.appendChild(gold)
  headline.appendChild(suffix)
  page.appendChild(headline)

  const lede = document.createElement('p')
  lede.className = 'qa-onb-lede'
  lede.textContent = 'You can change this anytime in Settings. Auto follows your device at sunset.'
  page.appendChild(lede)

  const current = await loadTheme()
  const swatches = document.createElement('div')
  swatches.className = 'qa-onb-swatches'
  for (const opt of getThemeOptions()) {
    const sw = document.createElement('button')
    sw.type = 'button'
    sw.className = `qa-onb-sw qa-onb-sw--${opt}`
    if (opt === current || (current === 'light' && opt === 'sepia')) {
      sw.classList.add('qa-onb-sw--on')
    }
    const chip = document.createElement('span')
    chip.className = 'qa-onb-sw-chip'
    const glyph = document.createElement('span')
    glyph.className = 'qa-onb-sw-glyph'
    glyph.textContent = '\u0627\u0644\u0644\u0647'
    glyph.setAttribute('dir', 'rtl')
    chip.appendChild(glyph)
    const label = document.createElement('span')
    label.className = 'qa-onb-sw-label'
    label.textContent = opt.charAt(0).toUpperCase() + opt.slice(1)
    sw.appendChild(chip)
    sw.appendChild(label)
    sw.addEventListener('click', async () => {
      await setTheme(opt)
      for (const b of swatches.querySelectorAll('.qa-onb-sw')) {
        b.classList.toggle('qa-onb-sw--on', b === sw)
      }
    })
    swatches.appendChild(sw)
  }
  page.appendChild(swatches)

  const cta = document.createElement('button')
  cta.type = 'button'
  cta.className = 'qa-onb-cta qa-onb-cta--primary'
  cta.textContent = 'Continue'
  cta.addEventListener('click', cb.onContinue)
  const row = document.createElement('div')
  row.className = 'qa-onb-cta-row'
  row.appendChild(cta)
  page.appendChild(row)
}

async function renderTranslation(page, cb) {
  const headline = document.createElement('h1')
  headline.className = 'qa-onb-headline'
  const prefix = document.createTextNode('Which ')
  const gold = document.createElement('span')
  gold.className = 'qa-onb-gold'
  gold.textContent = 'translation'
  const suffix = document.createTextNode('?')
  headline.appendChild(prefix)
  headline.appendChild(gold)
  headline.appendChild(suffix)
  page.appendChild(headline)

  const lede = document.createElement('p')
  lede.className = 'qa-onb-lede'
  lede.textContent = 'All translations ship offline. Switch between them per verse later.'
  page.appendChild(lede)

  const opts = [
    { id: 'saheeh',    name: 'Saheeh International', sub: 'Plain modern English · widely used', meta: 'Default' },
    { id: 'pickthall', name: 'Pickthall',            sub: 'Classical, reverent phrasing · 1930' },
    { id: 'yusuf',     name: 'Yusuf Ali',            sub: 'Literary, with commentary voice' },
    { id: 'khattab',   name: 'Clear Qur\u2019an — Dr. Mustafa Khattab', sub: 'Contemporary, accessible' },
  ]

  let selected = 'saheeh'
  const list = document.createElement('div')
  list.className = 'qa-onb-tlist'
  for (const o of opts) {
    const row = document.createElement('button')
    row.type = 'button'
    row.className = 'qa-onb-t' + (o.id === selected ? ' qa-onb-t--on' : '')
    const radio = document.createElement('span')
    radio.className = 'qa-onb-t-radio'
    const body = document.createElement('span')
    body.className = 'qa-onb-t-body'
    const name = document.createElement('span')
    name.className = 'qa-onb-t-name'
    name.textContent = o.name
    const sub = document.createElement('span')
    sub.className = 'qa-onb-t-sub'
    sub.textContent = o.sub
    body.appendChild(name)
    body.appendChild(sub)
    row.appendChild(radio)
    row.appendChild(body)
    if (o.meta) {
      const meta = document.createElement('span')
      meta.className = 'qa-onb-t-meta'
      meta.textContent = o.meta
      row.appendChild(meta)
    }
    row.addEventListener('click', async () => {
      selected = o.id
      try { await put('settings', { key: 'translationId', value: o.id }) } catch { /* ignore */ }
      for (const r of list.querySelectorAll('.qa-onb-t')) {
        r.classList.toggle('qa-onb-t--on', r === row)
      }
    })
    list.appendChild(row)
  }
  page.appendChild(list)

  const cta = document.createElement('button')
  cta.type = 'button'
  cta.className = 'qa-onb-cta qa-onb-cta--primary'
  cta.textContent = 'Continue'
  cta.addEventListener('click', cb.onContinue)
  const row = document.createElement('div')
  row.className = 'qa-onb-cta-row'
  row.appendChild(cta)
  page.appendChild(row)
}

function renderTagsIntro(page, cb) {
  const headline = document.createElement('h1')
  headline.className = 'qa-onb-headline'
  const prefix = document.createTextNode('Mark what ')
  const gold = document.createElement('span')
  gold.className = 'qa-onb-gold'
  gold.textContent = 'speaks'
  const suffix = document.createTextNode(' to you.')
  headline.appendChild(prefix)
  headline.appendChild(gold)
  headline.appendChild(suffix)
  page.appendChild(headline)

  const lede = document.createElement('p')
  lede.className = 'qa-onb-lede'
  lede.textContent = 'Long-press any verse to save it with a tag — mercy, patience, reflection — and revisit it later grouped by theme.'
  page.appendChild(lede)

  const preview = document.createElement('div')
  preview.className = 'qa-onb-vpreview'
  const ref = document.createElement('div')
  ref.className = 'qa-onb-vref'
  ref.textContent = '2:286 · Al-Baqarah'
  const ar = document.createElement('div')
  ar.className = 'qa-onb-var'
  ar.setAttribute('dir', 'rtl')
  ar.textContent = 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا'
  const en = document.createElement('div')
  en.className = 'qa-onb-ven'
  en.textContent = '"Allah does not burden a soul beyond what it can bear."'
  const chips = document.createElement('div')
  chips.className = 'qa-onb-chips'
  for (const [t, color] of [['mercy', '#64a078'], ['patience', '#6e96b4'], ['tawakkul', '#b4826e']]) {
    const c = document.createElement('span')
    c.className = 'qa-onb-chip'
    const d = document.createElement('span')
    d.className = 'qa-onb-chip-dot'
    d.style.backgroundColor = color
    c.appendChild(d)
    c.appendChild(document.createTextNode(t))
    chips.appendChild(c)
  }
  preview.appendChild(ref)
  preview.appendChild(ar)
  preview.appendChild(en)
  preview.appendChild(chips)
  page.appendChild(preview)

  const privacy = document.createElement('div')
  privacy.className = 'qa-onb-privacy'
  privacy.textContent = 'Your marks live on this device. Private by default — nothing synced, nothing tracked.'
  page.appendChild(privacy)

  const row = document.createElement('div')
  row.className = 'qa-onb-cta-row'
  const primary = document.createElement('button')
  primary.type = 'button'
  primary.className = 'qa-onb-cta qa-onb-cta--primary'
  primary.textContent = 'Open Al-Fatihah'
  primary.addEventListener('click', cb.onFinishFatihah)
  const ghost = document.createElement('button')
  ghost.type = 'button'
  ghost.className = 'qa-onb-cta qa-onb-cta--ghost'
  ghost.textContent = 'Browse all surahs'
  ghost.addEventListener('click', cb.onFinishSurahList)
  row.appendChild(primary)
  row.appendChild(ghost)
  page.appendChild(row)
}

function renderShortcuts(page, cb) {
  const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform)
  const cmd = isMac ? '\u2318' : 'Ctrl' // ⌘

  const headline = document.createElement('h1')
  headline.className = 'qa-onb-headline'
  headline.textContent = 'A few shortcuts'
  page.appendChild(headline)

  const lede = document.createElement('p')
  lede.className = 'qa-onb-lede'
  lede.textContent = 'QuranAtlas is faster than tapping. These work anywhere in the app.'
  page.appendChild(lede)

  const grid = document.createElement('div')
  grid.className = 'qa-onb-shortcuts'

  const rows = [
    { keys: [cmd, 'K'],           desc: 'Search verses, tags, surahs' },
    { keys: [cmd, '\u2191'],      desc: 'Bigger font', aux: [cmd, '\u2193', 'Smaller font'] },
    { keys: ['g', 'r'],           desc: 'Review hub' },
    { keys: ['g', 's'],           desc: 'Surah list' },
    { keys: ['g', ','],           desc: 'Settings' },
    { keys: ['Long-press'],       desc: 'Mark & tag a verse', gesture: true },
  ]

  for (const r of rows) {
    const row = document.createElement('div')
    row.className = 'qa-onb-shortcut-row'

    const kbdWrap = document.createElement('div')
    kbdWrap.className = 'qa-onb-shortcut-keys'
    for (let i = 0; i < r.keys.length; i++) {
      const kbd = document.createElement('kbd')
      kbd.className = 'qa-onb-kbd' + (r.gesture ? ' qa-onb-kbd--gesture' : '')
      kbd.textContent = r.keys[i]
      kbdWrap.appendChild(kbd)
    }
    row.appendChild(kbdWrap)

    const desc = document.createElement('span')
    desc.className = 'qa-onb-shortcut-desc'
    desc.textContent = r.desc
    row.appendChild(desc)

    grid.appendChild(row)
  }

  page.appendChild(grid)

  const cta = document.createElement('button')
  cta.type = 'button'
  cta.className = 'qa-onb-cta qa-onb-cta--primary'
  cta.textContent = 'Continue'
  cta.addEventListener('click', cb.onContinue)

  const row = document.createElement('div')
  row.className = 'qa-onb-cta-row'
  row.appendChild(cta)
  page.appendChild(row)
}
