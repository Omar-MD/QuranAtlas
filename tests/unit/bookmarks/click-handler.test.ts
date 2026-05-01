import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/bookmarks/store', () => ({
  toggle: vi.fn(async () => {}),
}))
vi.mock('../../../src/state/settings.svelte', () => ({
  settings: { riwayah: 'qaloon' },
}))
vi.mock('../../../src/state/tag-session.svelte', () => ({
  tagSession: { quickbarOpen: false },
}))
vi.mock('../../../src/core/logger', () => ({
  logger: { error: vi.fn() },
}))

import { initBookmarkClickHandler } from '../../../src/bookmarks/click-handler'
import { toggle } from '../../../src/bookmarks/store'

function makeVerseFixture(opts: {
  outerTokenKey?: string
  numTokenKey?: string
}): { num: HTMLElement, cleanup: () => void } {
  const article = document.createElement('article')
  article.className = 'qa-verse'
  if (opts.outerTokenKey !== undefined) {
    article.setAttribute('data-token-key', opts.outerTokenKey)
  }
  const num = document.createElement('span')
  num.className = 'qa-verse-number'
  if (opts.numTokenKey !== undefined) {
    num.setAttribute('data-token-key', opts.numTokenKey)
  }
  num.textContent = '255'
  article.appendChild(num)
  document.body.appendChild(article)
  return { num, cleanup: () => { article.remove() } }
}

describe('bookmarks/click-handler', () => {
  let cleanupHandler: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('toggles using verseKey derived from data-token-key (post-N19)', async () => {
    const { num, cleanup } = makeVerseFixture({ outerTokenKey: '2:255' })
    cleanupHandler = initBookmarkClickHandler()
    num.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
    await Promise.resolve()
    expect(toggle).toHaveBeenCalledWith('2:255', 'qaloon')
    cleanupHandler()
    cleanup()
  })

  it('strips word-grain wordIdx for IDB key (future WBW)', async () => {
    const { num, cleanup } = makeVerseFixture({
      outerTokenKey: '2:255',
      numTokenKey: '2:255:7',
    })
    cleanupHandler = initBookmarkClickHandler()
    num.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
    await Promise.resolve()
    // Bookmark IDB key is verse-grain; wordIdx must be stripped.
    expect(toggle).toHaveBeenCalledWith('2:255', 'qaloon')
    cleanupHandler()
    cleanup()
  })
})
