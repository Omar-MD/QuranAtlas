import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/marks/store', () => ({
  getAll: vi.fn(async () => [{ verseKey: '2:255', threads: ['mercy'] }]),
  getByVerseKey: vi.fn(async (k: string) =>
    k === '2:255' ? { verseKey: '2:255', threads: ['mercy'] } : undefined,
  ),
}))
vi.mock('../../../src/core/events', () => ({
  on: vi.fn(() => () => {}),
}))

import { refreshForSurah } from '../../../src/marks/indicator'

function addVerse(parent: HTMLElement, key: string): HTMLElement {
  const article = document.createElement('article')
  article.className = 'qa-verse'
  article.setAttribute('data-token-key', key)
  parent.appendChild(article)
  return article
}

describe('marks/indicator', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
  })

  it('decorates verses identified by data-token-key (post-N19)', async () => {
    addVerse(document.body, '2:255')
    addVerse(document.body, '2:1')
    await refreshForSurah(2)
    // Async getByVerseKey resolves on next microtask flush.
    for (let i = 0; i < 4; i++) { await Promise.resolve() }
    const v255 = document.querySelector('[data-token-key="2:255"]') as HTMLElement
    const v1 = document.querySelector('[data-token-key="2:1"]') as HTMLElement
    expect(v255.classList.contains('qa-verse--bookmarked')).toBe(true)
    expect(v1.classList.contains('qa-verse--bookmarked')).toBe(false)
  })
})
