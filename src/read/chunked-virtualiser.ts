/**
 * Chunked virtualiser — IntersectionObserver-driven recycler that mounts
 * verses in 20-ayat chunks and keeps a sliding window of ±1 chunk live
 * (max 3 chunks live = 60 verses). Chunks outside the window become
 * inert spacer divs whose cached height preserves scrollHeight.
 *
 * Three states per chunk:
 *   - 'live'    : <Verse> components mounted via Svelte 5 mount()
 *   - 'loading' : 20 skeleton-line <div>s populated via createElement
 *   - 'spacer'  : empty <div> with inline `style.height` from cache
 *
 * `style.height` on spacer divs joins the R-19c CSP `unsafe-inline`
 * carve-out (continuous DOM-driven values; see `csp-allowlist.md`).
 *
 * This module never writes innerHTML. Children are added/removed via
 * createElement + appendChild + replaceChildren — Svelte components via
 * the caller-supplied mountVerse callback (which wraps Svelte 5's
 * mount() / unmount() in application code).
 */

export const CHUNK_SIZE = 20
export const WINDOW_RADIUS = 1
const ESTIMATED_AYAH_HEIGHT_PX = 80
let estimatedAyahHeight = ESTIMATED_AYAH_HEIGHT_PX

export function chunkOf(verseNum: number): number {
  return Math.floor((verseNum - 1) / CHUNK_SIZE)
}

export interface VerseLike {
  aya_no: number
  key: string
}

/**
 * Caller-supplied mount: receives the chunk DOM container + one verse.
 * Returns a destroy function that the virtualiser calls on chunk eviction
 * to unmount the verse cleanly. Wraps Svelte 5's mount()/unmount() in
 * application code so this module stays component-agnostic and has no
 * innerHTML surface of its own.
 */
export type MountVerse<V extends VerseLike> = (
  target: HTMLElement,
  verse: V,
) => () => void

export interface VirtualiserOpts<V extends VerseLike> {
  container: HTMLElement
  verses: V[]
  mountVerse: MountVerse<V>
  /** Fires after a chunk transitions to 'live' with the chunk's verse elements. */
  onChunkLive: (chunkIdx: number, verseEls: HTMLElement[]) => void
}

export interface VirtualiserHandle {
  setCurrentChunk: (idx: number) => void
  ensureVerseRendered: (verseNum: number) => void
  invalidateHeightCache: () => void
  destroy: () => void
}

type ChunkState = 'spacer' | 'loading' | 'live'

interface ChunkSlot {
  el: HTMLElement
  state: ChunkState
  verseDestroyers: Array<() => void>
}

export function setupVirtualiser<V extends VerseLike>(
  opts: VirtualiserOpts<V>,
): VirtualiserHandle {
  const { container, verses, mountVerse, onChunkLive } = opts
  const totalChunks = Math.max(1, Math.ceil(verses.length / CHUNK_SIZE))
  const heightCache = new Map<number, number>()
  const slots: ChunkSlot[] = []
  let currentChunk = 0
  let destroyed = false

  for (let i = 0; i < totalChunks; i++) {
    const el = document.createElement('div')
    el.setAttribute('data-chunk', String(i))
    container.appendChild(el)
    slots.push({ el, state: 'spacer', verseDestroyers: [] })
  }

  function clearChildren(slot: ChunkSlot): void {
    for (const d of slot.verseDestroyers) {
      try { d() } catch { /* best-effort */ }
    }
    slot.verseDestroyers.length = 0
    slot.el.replaceChildren()
  }

  function setSpacer(slot: ChunkSlot, idx: number): void {
    clearChildren(slot)
    slot.el.style.removeProperty('height')
    const cached = heightCache.get(idx)
    const h = cached ?? estimatedAyahHeight * CHUNK_SIZE
    slot.el.style.height = `${Math.round(h)}px`
    slot.el.setAttribute('data-chunk-state', 'spacer')
    slot.state = 'spacer'
  }

  function setLoading(slot: ChunkSlot): void {
    clearChildren(slot)
    slot.el.style.removeProperty('height')
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const sk = document.createElement('div')
      sk.className = 'qa-skeleton qa-skeleton-line'
      slot.el.appendChild(sk)
    }
    slot.el.setAttribute('data-chunk-state', 'loading')
    slot.state = 'loading'
  }

  function setLive(slot: ChunkSlot, idx: number): void {
    clearChildren(slot)
    slot.el.style.removeProperty('height')
    const start = idx * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, verses.length)
    for (let i = start; i < end; i++) {
      const v = verses[i]
      if (!v) { continue }
      const destroy = mountVerse(slot.el, v)
      slot.verseDestroyers.push(destroy)
    }
    slot.el.setAttribute('data-chunk-state', 'live')
    slot.state = 'live'
    const verseEls = Array.from(slot.el.querySelectorAll<HTMLElement>('.qa-verse'))
    onChunkLive(idx, verseEls)
  }

  function evictToSpacer(slot: ChunkSlot, idx: number): void {
    const measured = slot.el.offsetHeight
    if (measured > 0) { heightCache.set(idx, measured) }
    setSpacer(slot, idx)
  }

  function reconcile(opts: { sync?: boolean } = {}): void {
    if (destroyed) { return }
    const lo = Math.max(0, currentChunk - WINDOW_RADIUS)
    const hi = Math.min(totalChunks - 1, currentChunk + WINDOW_RADIUS)
    for (let i = 0; i < totalChunks; i++) {
      const slot = slots[i]
      if (!slot) { continue }
      const inWindow = i >= lo && i <= hi
      if (inWindow) {
        if (slot.state === 'live') { continue }
        if (opts.sync) {
          // ensureVerseRendered / deep-link / warm-resume path: target chunk
          // must exist in DOM synchronously so scrollToVerse's rAF retry
          // finds it. Skip the skeleton loading state.
          setLive(slot, i)
        } else {
          // Scroll-driven path: brief skeleton → live transition over one
          // rAF gives the user a visual cue that content is appearing.
          setLoading(slot)
          const idxCapture = i
          requestAnimationFrame(() => {
            if (destroyed) { return }
            const s = slots[idxCapture]
            if (s && s.state === 'loading') { setLive(s, idxCapture) }
          })
        }
      } else if (slot.state === 'live') {
        evictToSpacer(slot, i)
      }
    }
    if (heightCache.size > 0) {
      const sample = heightCache.values().next().value
      if (typeof sample === 'number' && sample > 0) {
        estimatedAyahHeight = Math.max(20, Math.round(sample / CHUNK_SIZE))
      }
    }
  }

  function setCurrentChunk(idx: number, opts: { sync?: boolean } = {}): void {
    const clamped = Math.max(0, Math.min(totalChunks - 1, idx))
    if (clamped === currentChunk && slots[clamped]?.state === 'live') { return }
    currentChunk = clamped
    reconcile(opts)
  }

  function ensureVerseRendered(verseNum: number): void {
    // Sync materialise — caller (scrollToVerse / warm-resume) needs the
    // verse element in the DOM by the next rAF.
    setCurrentChunk(chunkOf(verseNum), { sync: true })
  }

  function invalidateHeightCache(): void {
    heightCache.clear()
    for (let i = 0; i < totalChunks; i++) {
      const slot = slots[i]
      if (slot && slot.state === 'spacer') { setSpacer(slot, i) }
    }
  }

  // Initial paint: chunk 0 transitions synchronously to live (no rAF wait —
  // matches the pre-N20 behaviour where the first chunk paints immediately
  // on mount). Other chunks born as spacer.
  for (let i = 0; i < totalChunks; i++) {
    const slot = slots[i]
    if (slot) { setSpacer(slot, i) }
  }
  if (slots[0]) { setLive(slots[0], 0) }

  function destroy(): void {
    destroyed = true
    for (const slot of slots) {
      clearChildren(slot)
      slot.el.remove()
    }
    slots.length = 0
  }

  return { setCurrentChunk, ensureVerseRendered, invalidateHeightCache, destroy }
}
