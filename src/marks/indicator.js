/**
 * Colored dot indicators on marked verses.
 * Subscribes to reader:verse-rendered to decorate newly rendered verses.
 * Subscribes to marks:saved / marks:deleted to update existing indicators.
 */

import { getByVerseKey } from './store.js'
import { getColorForTag } from './tags.js'
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'

/**
 * Decorate a verse element with colored tag dots.
 * @param {string} verseKey - e.g. '2:255'
 * @param {HTMLElement} element - the verse DOM element
 */
export async function decorateVerse(verseKey, element) {
  const existing = element.querySelector('.qa-mark-dots')
  if (existing) {
    existing.remove()
  }

  const mark = await getByVerseKey(verseKey)
  if (!mark || mark.tags.length === 0) {
    return
  }

  const dots = document.createElement('div')
  dots.className = 'qa-mark-dots'

  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    dots.appendChild(dot)
  }

  element.insertBefore(dots, element.firstChild)
}

/**
 * Initialize indicator listeners.
 * @returns {Function} cleanup function
 */
export function init() {
  const unsub1 = on(Events.READER_VERSE_RENDERED, ({ verseKey, element }) => {
    decorateVerse(verseKey, element)
  })

  const unsub2 = on(Events.MARKS_SAVED, ({ verseKey }) => {
    const el = document.querySelector(`[data-verse-key="${verseKey}"]`)
    if (el) {
      decorateVerse(verseKey, el)
    }
  })

  const unsub3 = on(Events.MARKS_DELETED, ({ verseKey }) => {
    const el = document.querySelector(`[data-verse-key="${verseKey}"]`)
    if (el) {
      const dots = el.querySelector('.qa-mark-dots')
      if (dots) {
        dots.remove()
      }
    }
  })

  const unsub4 = on(Events.MARKS_UNDO, ({ verseKey }) => {
    const el = document.querySelector(`[data-verse-key="${verseKey}"]`)
    if (el) {
      decorateVerse(verseKey, el)
    }
  })

  return () => { unsub1(); unsub2(); unsub3(); unsub4() }
}
