/**
 * Component tests for TagSheet.svelte (deep tag editor).
 *
 * Ports:
 *   C1 keyboard: Escape closes the deep TagSheet
 *   C2: type in a layer combobox + Enter → chip appears + draft updates
 *   C2: click a selected hchip → toggles it off
 *   C3: type a brand-new label + Enter → tag added
 *   C: Save calls marks/store.save() with the layered draft + closes
 *
 * As of 2026-05-01 (audit N22) TagSheet is api-driven — open via
 * `tagSheetBridge.api.open(verseKey)` after render. Close path either
 * dispatches Esc or clicks Save → component's internal onclose calls
 * tagSession.end() and flips isOpen=false.
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/mark/store', () => ({
  save: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  getByVerseKey: vi.fn(async () => undefined),
}))

vi.mock('../../../../src/data/dataset', () => ({
  getSurah: vi.fn(async () => ({ ayat: [{ aya_text: 'بِسْمِ ٱللَّهِ' }] })),
  getSurahs: vi.fn(async () => [{ n: 1, name: 'Al-Fatihah' }]),
  getTranslations: vi.fn(async () => []),
}))

vi.mock('../../../../src/core/ui-bridge', () => ({
  showUndoToast: vi.fn(),
}))

import TagSheet from '../../../../src/mark/tag/TagSheet.svelte'
import { tagSession } from '../../../../src/mark/tag/state.svelte'
import { tagSheetBridge } from '../../../../src/mark/tag/sheet-bridge'
import { save } from '../../../../src/mark/store'

const saveMock = vi.mocked(save)

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

async function mountAndOpen(): Promise<void> {
  render(TagSheet)
  await flush()
  tagSession.end()
  tagSession.begin('1:1')
  tagSheetBridge.api.open('1:1')
  await flush()
}

describe('TagSheet.svelte (C1 / C2 / C3 / save)', () => {
  beforeEach(() => {
    saveMock.mockClear()
    tagSession.end()
  })

  it('C1 keyboard: Escape closes the sheet', async () => {
    await mountAndOpen()
    expect(document.querySelector('.qa-ts')).not.toBeNull()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()

    expect(document.querySelector('.qa-ts')).toBeNull()
    expect(tagSheetBridge.isOpen()).toBe(false)
  })

  function findThreadsInput() {
    const layers = document.querySelectorAll('.qa-ts-layer')
    for (const l of layers) {
      const lbl = l.querySelector('.qa-ts-lbl')
      if (lbl?.textContent && /^thread/i.test(lbl.textContent)) {
        return l.querySelector('.qa-ts-combo-input') as HTMLInputElement | null
      }
    }
    return null
  }

  it('C2: type in threads combobox + Enter → chip + draft layer + count badges update', async () => {
    await mountAndOpen()

    const input = findThreadsInput()!
    expect(input).not.toBeNull()

    input.focus()
    input.value = 'mercy'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await fireEvent.keyDown(input, { key: 'Enter' })
    await flush()

    expect(tagSession.draft.threads).toContain('mercy')
    const chip = [...document.querySelectorAll('.qa-ts-hchip--on')].find(
      el => el.textContent?.includes('mercy')
    )
    expect(chip).toBeDefined()

    // Header count badge reads "1"
    expect(document.querySelector('.qa-ts-count')?.textContent).toMatch(/1/)
    // The Themes group's count badge reads "1"
    const themesGrp = [...document.querySelectorAll('.qa-ts-grp')].find(
      el => el.querySelector('.qa-ts-grp-name')?.textContent === 'Themes'
    )!
    expect(themesGrp.querySelector('.qa-ts-grp-count')?.textContent).toBe('1')
  })

  it('C3: type a brand-new (non-seed) label + Enter commits it on the draft', async () => {
    await mountAndOpen()

    const input = findThreadsInput()!
    input.focus()
    input.value = 'unique-custom-tag-xyz'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await fireEvent.keyDown(input, { key: 'Enter' })
    await flush()

    expect(tagSession.draft.threads).toContain('unique-custom-tag-xyz')
    expect(input.value).toBe('')
  })

  it('C2: click a selected hchip toggles it off the draft', async () => {
    await mountAndOpen()

    const input = findThreadsInput()!
    input.value = 'mercy'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await fireEvent.keyDown(input, { key: 'Enter' })
    await flush()

    const chip = [...document.querySelectorAll('.qa-ts-hchip--on')].find(
      el => el.textContent?.includes('mercy')
    ) as HTMLButtonElement
    await fireEvent.click(chip)
    await flush()

    expect(tagSession.draft.threads).not.toContain('mercy')
  })

  it('save: clicking Save persists the layered draft via marks/store + closes', async () => {
    await mountAndOpen()

    const input = findThreadsInput()!
    input.value = 'mercy'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await fireEvent.keyDown(input, { key: 'Enter' })
    await flush()

    const saveBtn = [...document.querySelectorAll('.qa-ts-btn--primary')]
      .find(el => el.textContent?.trim() === 'Save') as HTMLButtonElement
    expect(saveBtn).not.toBeNull()
    expect(saveBtn.disabled).toBe(false)
    await fireEvent.click(saveBtn)
    await flush()

    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock.mock.calls[0]![0]).toMatchObject({
      verseKey: '1:1',
      threads: ['mercy'],
    })
    // After save, onclose runs internally → bridge reports closed.
    expect(tagSheetBridge.isOpen()).toBe(false)
  })
})
