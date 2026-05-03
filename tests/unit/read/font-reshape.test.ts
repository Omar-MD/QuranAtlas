import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reshapeArabicVerses, reshapeAddedNodes } from '../../../src/read/font-reshape'

function clearBody() {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild)
  }
}

// Spy on offsetHeight reads, which reshape uses to force layout.
// Each verse gets its own spy that records (and counts) accesses.
function trackVerse(el: HTMLElement): { reads: number } {
  const tracker = { reads: 0 }
  Object.defineProperty(el, 'offsetHeight', {
    get() {
      tracker.reads += 1
      return 0
    },
    configurable: true,
  })
  return tracker
}

function makeTrackedVerse(): { el: HTMLElement; tracker: { reads: number } } {
  const el = document.createElement('div')
  el.className = 'qa-verse-arabic'
  const tracker = trackVerse(el)
  return { el, tracker }
}

describe('reshapeArabicVerses', () => {
  beforeEach(() => {
    clearBody()
  })

  it('reshapes only verses inside the given root subtree (R-04 scope guard)', () => {
    const outer = makeTrackedVerse()
    document.body.appendChild(outer.el)
    const subtree = document.createElement('div')
    document.body.appendChild(subtree)
    const inner1 = makeTrackedVerse()
    const inner2 = makeTrackedVerse()
    subtree.appendChild(inner1.el)
    subtree.appendChild(inner2.el)

    reshapeArabicVerses(subtree)

    // The whole point of R-04: do not touch verses outside the scoped root.
    expect(outer.tracker.reads).toBe(0)
    expect(inner1.tracker.reads).toBe(1)
    expect(inner2.tracker.reads).toBe(1)
  })

  it('reshapes the root itself when it matches .qa-verse-arabic', () => {
    const root = makeTrackedVerse()
    document.body.appendChild(root.el)

    reshapeArabicVerses(root.el)

    expect(root.tracker.reads).toBe(1)
  })

  it('returns harmlessly for roots without querySelectorAll', () => {
    const fake = { matches: () => false } as unknown as ParentNode
    expect(() => reshapeArabicVerses(fake)).not.toThrow()
  })
})

describe('reshapeAddedNodes', () => {
  beforeEach(() => {
    clearBody()
  })

  it('reshapes only verses inside addedNodes, not pre-existing siblings', () => {
    // Five pre-existing verses already painted by previous chunks.
    const preExisting = Array.from({ length: 5 }, () => {
      const v = makeTrackedVerse()
      document.body.appendChild(v.el)
      return v
    })

    // Three new verses appended in a wrapper (one chunk).
    const newWrapper = document.createElement('div')
    const newVerses = Array.from({ length: 3 }, () => {
      const v = makeTrackedVerse()
      newWrapper.appendChild(v.el)
      return v
    })
    document.body.appendChild(newWrapper)

    const fakeMutation: MutationRecord = {
      type: 'childList',
      target: document.body,
      addedNodes: [newWrapper] as unknown as NodeList,
      removedNodes: [] as unknown as NodeList,
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue: null,
    }

    reshapeAddedNodes([fakeMutation])

    // The 5 pre-existing verses must NOT be re-walked. Pre-fix code ran
    // querySelectorAll('.qa-verse-arabic') against document — every chunk
    // append re-touched every prior verse, ~1700 reflows on Al-Baqarah.
    for (const v of preExisting) {
      expect(v.tracker.reads).toBe(0)
    }
    // All 3 newly-added verses must have been reshaped exactly once.
    for (const v of newVerses) {
      expect(v.tracker.reads).toBe(1)
    }
  })

  it('handles addedNode that is itself a verse (not a wrapper)', () => {
    const newVerse = makeTrackedVerse()
    document.body.appendChild(newVerse.el)

    const fakeMutation: MutationRecord = {
      type: 'childList',
      target: document.body,
      addedNodes: [newVerse.el] as unknown as NodeList,
      removedNodes: [] as unknown as NodeList,
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue: null,
    }

    reshapeAddedNodes([fakeMutation])

    expect(newVerse.tracker.reads).toBe(1)
  })

  it('skips text nodes inside addedNodes', () => {
    const text = document.createTextNode('plain')
    const fakeMutation: MutationRecord = {
      type: 'childList',
      target: document.body,
      addedNodes: [text] as unknown as NodeList,
      removedNodes: [] as unknown as NodeList,
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue: null,
    }
    expect(() => reshapeAddedNodes([fakeMutation])).not.toThrow()
  })
})
