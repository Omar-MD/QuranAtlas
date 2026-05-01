import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  chunkOf,
  CHUNK_SIZE,
  WINDOW_RADIUS,
  setupVirtualiser,
} from '../../../src/reader/chunked-virtualiser'

describe('chunked-virtualiser/constants', () => {
  it('uses 20-ayat chunks', () => {
    expect(CHUNK_SIZE).toBe(20)
  })

  it('keeps ±1 chunk window (3 chunks live max, 60 verses)', () => {
    expect(WINDOW_RADIUS).toBe(1)
  })
})

describe('chunked-virtualiser/chunkOf', () => {
  it('verse 1 → chunk 0', () => {
    expect(chunkOf(1)).toBe(0)
  })

  it('verse 20 → chunk 0 (boundary)', () => {
    expect(chunkOf(20)).toBe(0)
  })

  it('verse 21 → chunk 1 (boundary)', () => {
    expect(chunkOf(21)).toBe(1)
  })

  it('verse 286 (al-Baqarah end) → chunk 14', () => {
    expect(chunkOf(286)).toBe(14)
  })
})

function makeVerses(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    aya_no: i + 1,
    key: `2:${i + 1}`,
  }))
}

function stubMounter(target: HTMLElement, verse: { aya_no: number; key: string }): () => void {
  const el = document.createElement('div')
  el.className = 'qa-verse'
  el.setAttribute('data-token-key', verse.key)
  el.setAttribute('data-verse', String(verse.aya_no))
  el.style.height = '50px'
  target.appendChild(el)
  return () => { el.remove() }
}

describe('chunked-virtualiser/state-machine', () => {
  let container: HTMLElement
  let cleanup: (() => void) | null = null

  beforeEach(() => {
    document.body.replaceChildren()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    cleanup?.()
    cleanup = null
    document.body.replaceChildren()
  })

  it('initial mount: chunk 0 live, chunks 1..N-1 spacer', () => {
    const verses = makeVerses(60)
    const handle = setupVirtualiser({
      container,
      verses,
      mountVerse: stubMounter,
      onChunkLive: () => {},
    })
    cleanup = handle.destroy
    const chunks = container.querySelectorAll('[data-chunk]')
    expect(chunks.length).toBe(3)
    expect(chunks[0]?.getAttribute('data-chunk-state')).toBe('live')
    expect(chunks[1]?.getAttribute('data-chunk-state')).toBe('spacer')
    expect(chunks[2]?.getAttribute('data-chunk-state')).toBe('spacer')
  })

  it('setCurrentChunk(1): chunks {0,1,2} live after rAF', async () => {
    const verses = makeVerses(80)
    const handle = setupVirtualiser({
      container,
      verses,
      mountVerse: stubMounter,
      onChunkLive: () => {},
    })
    cleanup = handle.destroy
    handle.setCurrentChunk(1)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const chunks = container.querySelectorAll('[data-chunk]')
    expect(chunks[0]?.getAttribute('data-chunk-state')).toBe('live')
    expect(chunks[1]?.getAttribute('data-chunk-state')).toBe('live')
    expect(chunks[2]?.getAttribute('data-chunk-state')).toBe('live')
    expect(chunks[3]?.getAttribute('data-chunk-state')).toBe('spacer')
  })

  it('eviction: chunk leaving window goes live → spacer with cached height', async () => {
    const verses = makeVerses(100)
    const handle = setupVirtualiser({
      container,
      verses,
      mountVerse: stubMounter,
      onChunkLive: () => {},
    })
    cleanup = handle.destroy
    handle.setCurrentChunk(3)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const chunks = container.querySelectorAll('[data-chunk]')
    expect(chunks[0]?.getAttribute('data-chunk-state')).toBe('spacer')
    const h = (chunks[0] as HTMLElement).style.height
    expect(h).toMatch(/\d+px/)
  })

  it('loading state inserts skeleton lines (between rAFs)', () => {
    const verses = makeVerses(40)
    const handle = setupVirtualiser({
      container,
      verses,
      mountVerse: stubMounter,
      onChunkLive: () => {},
    })
    cleanup = handle.destroy
    handle.setCurrentChunk(1)
    const chunks = container.querySelectorAll('[data-chunk]')
    const chunk1 = chunks[1] as HTMLElement
    expect(chunk1.getAttribute('data-chunk-state')).toBe('loading')
    expect(chunk1.querySelectorAll('.qa-skeleton-line').length).toBe(20)
  })
})

describe('chunked-virtualiser/ensureVerseRendered', () => {
  it('teleports to chunkOf(N); never more than 3 chunks live', async () => {
    const verses = makeVerses(200)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const handle = setupVirtualiser({
      container, verses, mountVerse: stubMounter, onChunkLive: () => {},
    })
    handle.ensureVerseRendered(150)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    const chunks = container.querySelectorAll('[data-chunk]')
    let liveCount = 0
    for (const c of chunks) { if (c.getAttribute('data-chunk-state') === 'live') liveCount++ }
    expect(liveCount).toBeLessThanOrEqual(3)
    expect(chunks[7]?.getAttribute('data-chunk-state')).toBe('live')
    handle.destroy()
    container.remove()
  })
})

describe('chunked-virtualiser/invalidateHeightCache', () => {
  it('clears cache; subsequent spacers fall back to estimated height', async () => {
    const verses = makeVerses(80)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const handle = setupVirtualiser({
      container, verses, mountVerse: stubMounter, onChunkLive: () => {},
    })
    handle.setCurrentChunk(2)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    handle.invalidateHeightCache()
    const chunk0 = container.querySelector('[data-chunk="0"]') as HTMLElement
    expect(chunk0.style.height).toBeTruthy()
    handle.destroy()
    container.remove()
  })
})
