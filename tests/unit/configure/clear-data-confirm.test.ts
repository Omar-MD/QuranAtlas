/**
 * Component test for ClearDataConfirm.svelte — ports D4 e2e tests.
 *
 * D4 cases:
 *   - type DELETE → confirm enabled → click → clearAllData runs → resolves true
 *   - Cancel → dialog closes, clearAllData NOT called → resolves false
 *   - Escape → dialog closes → resolves false
 *   - confirm stays disabled when input is partial / lowercase
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/a11y/announcer.js', () => ({ announce: vi.fn() }))
// Mock only the destructive bit. Keep registerClearDataConfirm + the bridge real.
// The factory is hoisted, so the mock fn must be created inside it.
vi.mock('../../../src/configure/clear-data.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/configure/clear-data.ts')>()
  return { ...actual, clearAllData: vi.fn(async () => true) }
})

import ClearDataConfirm from '../../../src/configure/ClearDataConfirm.svelte'
import { showClearDataConfirmation, clearAllData } from '../../../src/configure/clear-data.ts'

const clearAllDataMock = vi.mocked(clearAllData)

async function flush() {
  // Two microtasks: one for onMount → registerClearDataConfirm, one for $state→DOM.
  await Promise.resolve()
  await Promise.resolve()
}

describe('ClearDataConfirm.svelte (D4)', () => {
  beforeEach(() => {
    clearAllDataMock.mockClear()
    clearAllDataMock.mockResolvedValue(true)
  })

  it('D4 happy path: type DELETE → confirm runs clearAllData → resolves true', async () => {
    render(ClearDataConfirm)
    await flush()

    const promise = showClearDataConfirmation()
    await flush()

    const input = document.querySelector<HTMLInputElement>('.qa-input-confirm')
    expect(input).not.toBeNull()

    await fireEvent.input(input!, { target: { value: 'DELETE' } })

    const confirmBtn = document.querySelector<HTMLButtonElement>('.qa-modal-btn--danger')!
    expect(confirmBtn.disabled).toBe(false)
    expect(confirmBtn.className).not.toContain('qa-mark-btn')

    await fireEvent.click(confirmBtn)

    await expect(promise).resolves.toBe(true)
    expect(clearAllDataMock).toHaveBeenCalledTimes(1)
  })

  it('D4 cancel: click Cancel → resolves false → clearAllData not called', async () => {
    render(ClearDataConfirm)
    await flush()

    const promise = showClearDataConfirmation()
    await flush()

    const cancelBtn = document.querySelector<HTMLButtonElement>('.qa-modal-btn--ghost')!
    expect(cancelBtn).not.toBeNull()
    expect(cancelBtn.className).not.toContain('qa-mark-btn')
    await fireEvent.click(cancelBtn)

    await expect(promise).resolves.toBe(false)
    expect(clearAllDataMock).not.toHaveBeenCalled()
    expect(document.querySelector('.qa-modal-backdrop')).toBeNull()
  })

  it('D4 escape: Escape key on backdrop → resolves false', async () => {
    render(ClearDataConfirm)
    await flush()

    const promise = showClearDataConfirmation()
    await flush()

    const backdrop = document.querySelector<HTMLElement>('.qa-modal-backdrop')!
    expect(backdrop).not.toBeNull()
    await fireEvent.keyDown(backdrop, { key: 'Escape' })

    await expect(promise).resolves.toBe(false)
    expect(clearAllDataMock).not.toHaveBeenCalled()
  })

  it('D4 disabled-until-DELETE: confirm stays disabled for partial / lowercase input', async () => {
    render(ClearDataConfirm)
    await flush()

    const promise = showClearDataConfirmation()
    await flush()

    const input = document.querySelector<HTMLInputElement>('.qa-input-confirm')!
    const confirmBtn = document.querySelector<HTMLButtonElement>('.qa-modal-btn--danger')!

    await fireEvent.input(input, { target: { value: 'delete' } })
    expect(confirmBtn.disabled).toBe(true)

    await fireEvent.input(input, { target: { value: 'DELET' } })
    expect(confirmBtn.disabled).toBe(true)

    await fireEvent.input(input, { target: { value: 'DELETE' } })
    expect(confirmBtn.disabled).toBe(false)

    // Cancel so the promise resolves and the test exits cleanly.
    const cancelBtn = document.querySelector<HTMLButtonElement>('.qa-modal-btn--ghost')!
    await fireEvent.click(cancelBtn)
    await expect(promise).resolves.toBe(false)
  })

  it('D4 copy: describes reader-first saved data without removed-scope claims', async () => {
    render(ClearDataConfirm)
    await flush()

    const promise = showClearDataConfirmation()
    await flush()

    expect(document.body.textContent).toContain(
      'This will permanently delete saved reading positions, bookmarks, offline downloads, settings, and any older local QuranAtlas data still stored on this device. This action cannot be undone.',
    )
    expect(document.body.textContent).not.toMatch(/\bmarks\b/i)
    expect(document.body.textContent).not.toMatch(/\breview\b/i)
    expect(document.body.textContent).not.toMatch(/\baudio\b/i)

    const cancelBtn = document.querySelector<HTMLButtonElement>('.qa-modal-btn--ghost')!
    await fireEvent.click(cancelBtn)
    await expect(promise).resolves.toBe(false)
  })
})
