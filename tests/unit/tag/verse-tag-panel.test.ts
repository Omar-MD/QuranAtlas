/**
 * Component tests for VerseTagPanel.svelte (the fast-tag inline panel).
 *
 * Ports:
 *   C: ✕ close button → tagSession.end() (panel disappears on next render)
 *   C: ⛶ escalate button → quickbarOpen=false, tagSheetBridge.api.open fires
 *   C: chip click → tagSession.toggle() flips draft layer
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/marks/store', () => ({
  save: vi.fn(async () => undefined),
}))

import VerseTagPanel from '../../../src/reader/VerseTagPanel.svelte'
import { tagSession } from '../../../src/state/tag-session.svelte'
import { tagSheetBridge } from '../../../src/tag/sheet-bridge'

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('VerseTagPanel.svelte (C ✕ / ⛶ / chip)', () => {
  beforeEach(() => {
    tagSession.end()
    tagSession.begin('1:1')
    tagSession.quickbarOpen = true
  })

  it('C: ✕ close button calls tagSession.end()', async () => {
    render(VerseTagPanel, { props: { verseKey: '1:1' } })
    await flush()

    const close = document.querySelector<HTMLButtonElement>('[data-testid="vtp-close"]')!
    expect(close).not.toBeNull()
    expect(close.getAttribute('aria-label')).toBe('Exit fast-tag mode')

    await fireEvent.click(close)
    expect(tagSession.verseKey).toBeNull()
    expect(tagSession.quickbarOpen).toBe(false)
  })

  it('C: ⛶ escalate button closes the panel and opens the deep sheet via tagSheetBridge', async () => {
    render(VerseTagPanel, { props: { verseKey: '1:1' } })
    await flush()

    const escalate = document.querySelector<HTMLButtonElement>('.qa-vtp-escalate')!
    expect(escalate).not.toBeNull()
    expect(escalate.getAttribute('aria-label')).toBe('Open full tag editor')

    // Stand-in API for the bridge — captures whether open() was invoked.
    const opened: string[] = []
    tagSheetBridge.register({
      open: (vk: string) => opened.push(vk),
      close: () => undefined,
      isOpen: () => opened.length > 0,
    })

    await fireEvent.click(escalate)
    expect(tagSession.quickbarOpen).toBe(false)
    expect(opened).toEqual(['1:1'])

    tagSheetBridge.unregister()
  })

  it('C: chip click toggles the matching layer in the draft', async () => {
    render(VerseTagPanel, { props: { verseKey: '1:1' } })
    await flush()

    const chip = document.querySelector<HTMLButtonElement>('.qa-vtp-chip')!
    expect(chip).not.toBeNull()
    const value = chip.querySelector('.qa-vtp-val')!.textContent!

    await fireEvent.click(chip)

    const totalAfterFirst = tagSession.totalSelected()
    expect(totalAfterFirst).toBe(1)

    // Find any layer that now contains this value.
    const containing = Object.entries(tagSession.draft).find(([, vals]) =>
      (vals as string[]).includes(value)
    )
    expect(containing).toBeDefined()

    await fireEvent.click(chip)
    expect(tagSession.totalSelected()).toBe(0)
  })
})
