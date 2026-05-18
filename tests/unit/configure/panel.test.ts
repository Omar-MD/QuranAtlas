import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import Panel from '../../../src/configure/Panel.svelte'
import AssetManagement from '../../../src/configure/assets/AssetManagement.svelte'
import { openSettingsSheet } from '../../../src/configure/panel-bridge'
import { settings } from '../../../src/configure/state.svelte'

async function flush() {
  for (let i = 0; i < 4; i += 1) await Promise.resolve()
}

async function mountAndOpen(mode: 'verse' | 'mushaf' = 'verse') {
  render(Panel)
  await flush()
  openSettingsSheet(mode)
  await flush()
}

describe('mode-aware settings panel', () => {
  beforeEach(() => {
    Object.assign(settings, {
      theme: 'auto',
      nightMode: 'off',
      riwayah: 'qaloon',
      quranTextStyleId: 'uthmani-kfgqpc-v1',
      mushafEditionId: 'qalun-quran-ws-v1',
      translationId: 'bridges',
      tafsirId: 'muyassar',
      translationVisible: true,
      fontSize: 'md',
      lineSpacing: 'md',
      wordSpacing: 'md',
      readerMargin: 'md',
      verseSpacing: 'md',
    })
    window.location.hash = '#/s/1'
  })

  it('opens Verse Settings with text-style controls and Manage Assets', async () => {
    await mountAndOpen('verse')

    expect(screen.getByRole('dialog', { name: 'Verse Settings' })).toBeInTheDocument()
    expect(screen.getByText('Quran Text Style')).toBeInTheDocument()
    expect(screen.queryByText('Mushaf Edition')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Assets' })).toBeInTheDocument()
  })

  it('opens Mushaf Settings without verse typography/storage rows', async () => {
    await mountAndOpen('mushaf')

    expect(screen.getByRole('dialog', { name: 'Mushaf Settings' })).toBeInTheDocument()
    expect(screen.getByText('Mushaf Edition')).toBeInTheDocument()
    expect(screen.queryByText('Font Size')).not.toBeInTheDocument()
    expect(screen.queryByText('Reset')).not.toBeInTheDocument()
    expect(screen.queryByText('Storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Recitation')).not.toBeInTheDocument()
  })

  it('Escape closes the active settings shell', async () => {
    await mountAndOpen('verse')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()
    expect(screen.queryByRole('dialog', { name: 'Verse Settings' })).not.toBeInTheDocument()
  })

  it('Manage Assets closes settings and routes to assets', async () => {
    await mountAndOpen('verse')
    await fireEvent.click(screen.getByRole('button', { name: 'Manage Assets' }))
    await flush()
    expect(screen.queryByRole('dialog', { name: 'Verse Settings' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#/assets')
  })

  it('Manage Assets suppresses settings opener focus restoration', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'Reader settings'
    document.body.appendChild(opener)
    opener.focus()
    await mountAndOpen('verse')

    await fireEvent.click(screen.getByRole('button', { name: 'Manage Assets' }))
    await flush()

    expect(document.activeElement).not.toBe(opener)
    opener.remove()
  })

  it('direct asset management entry exposes reader fallback and focuses the page heading', async () => {
    render(AssetManagement, { props: { historyCanGoBack: false } })
    await flush()

    expect(screen.getByRole('link', { name: 'Back to Reader' })).toHaveAttribute('href', '#/s/1')
    expect(screen.getByRole('heading', { name: 'Asset Management' })).toHaveFocus()
  })

  it('writes verse typography controls through the settings writers', async () => {
    await mountAndOpen('verse')

    await fireEvent.input(screen.getByLabelText('Font Size'), { target: { value: '4' } })
    await fireEvent.input(screen.getByLabelText('Reading Flow'), { target: { value: '1' } })
    await flush()

    expect(settings.fontSize).toBe('xl')
    expect(settings.lineSpacing).toBe('sm')
    expect(settings.wordSpacing).toBe('sm')
    expect(settings.readerMargin).toBe('sm')
    expect(settings.verseSpacing).toBe('sm')
  })
})
