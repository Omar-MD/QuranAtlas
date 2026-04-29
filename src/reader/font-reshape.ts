// iOS Safari paints the reader DOM with a fallback font when verses mount
// before the KFGQPC Uthmanic riwayah face swaps in, then doesn't re-shape
// RTL Arabic text when font-display:swap brings in the real face —
// combining marks (sukun, dagger alif, small high seen) collapse to base
// position. Toggling a no-op transform invalidates the layout cache + re-
// runs glyph shaping with the now-loaded KFGQPC face.
//
// Called once on document.fonts.ready (whole document) and per-added-node
// from a MutationObserver on #main-content. Scoping to the added node
// (rather than re-walking the entire document) is required because the
// reader appends 286-verse surahs in chunks: a document-wide walk is
// O(verses-rendered-so-far) per chunk = ~1700 forced reflows on Al-Baqarah.

const VERSE_SELECTOR = '.qa-verse-arabic'

function reshapeOne(el: HTMLElement): void {
  el.style.transform = 'translateZ(0)'
  void el.offsetHeight
  el.style.transform = ''
}

export function reshapeArabicVerses(root: ParentNode | Element = document): void {
  if ((root as Element).matches?.(VERSE_SELECTOR)) {
    reshapeOne(root as HTMLElement)
  }
  const verses = (root as ParentNode).querySelectorAll?.(VERSE_SELECTOR)
  if (!verses) return
  for (const el of verses) {
    reshapeOne(el as HTMLElement)
  }
}

export function reshapeAddedNodes(mutations: Iterable<MutationRecord>): void {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === 1) {
        reshapeArabicVerses(node as Element)
      }
    }
  }
}
