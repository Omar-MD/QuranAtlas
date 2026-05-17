import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/continuity/bookmarks/store', () => ({
  getAllForRiwayah: vi.fn(async () => [
    { verseKey: '2:255' },
  ]),
}))

vi.mock('../../../../src/configure/state.svelte', () => ({
  settings: { riwayah: 'qaloon' },
}))

import { refreshBookmarkIndicatorsForSurah } from '../../../../src/navigate/bookmarks/indicator'

function addVerse(parent: HTMLElement, key: string): HTMLElement {
  const article = document.createElement('article')
  article.className = 'qa-verse'
  article.setAttribute('data-token-key', key)
  parent.appendChild(article)
  return article
}

describe('navigate/bookmarks/indicator', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('decorates bookmarked verses for the active surah', async () => {
    addVerse(document.body, '2:255')
    addVerse(document.body, '2:1')

    await refreshBookmarkIndicatorsForSurah(2)

    const bookmarked = document.querySelector('[data-token-key="2:255"]') as HTMLElement
    const plain = document.querySelector('[data-token-key="2:1"]') as HTMLElement

    expect(bookmarked.classList.contains('qa-verse--bookmarked-glyph')).toBe(true)
    expect(plain.classList.contains('qa-verse--bookmarked-glyph')).toBe(false)
  })
})
