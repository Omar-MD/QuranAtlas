import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ReaderRoute } from '../../../src-react/app/routes/read/ReaderRoute'
import { MushafRoute } from '../../../src-react/app/routes/read/MushafRoute'
import { resolveTranslationFor } from '../../../src-react/data/verse-aliases'

describe('React reader parity', () => {
  it('resolves continuation translation aliases without duplicating text', () => {
    const aliases = { '7': [{ hafs: 2, warsh: [2, 3], qaloon: [2, 3] }] }
    expect(resolveTranslationFor({ surah: 7, verse: 3, riwayah: 'qaloon', translations: { '7:2': 'guidance' }, aliases })).toEqual({
      role: 'continuation',
      sourceKey: '7:2',
      text: null,
    })
  })

  it('renders verse route with data-token-key hooks and reader chrome', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    render(<ReaderRoute surah={1} ayah={1} />)
    expect(await screen.findByRole('main', { name: /verse reader/i })).toBeInTheDocument()
    expect(screen.getByText('QuranAtlas')).toBeInTheDocument()
    expect(screen.getByTestId('verse-1:1')).toHaveAttribute('data-token-key', '1:1')
    vi.unstubAllGlobals()
  })

  it('renders mushaf route with an explicit asset gate', () => {
    render(<MushafRoute page={1} assetState="missing" />)
    expect(screen.getByRole('main', { name: /mushaf reader/i })).toBeInTheDocument()
    expect(screen.getByText(/page pack is not installed/i)).toBeInTheDocument()
  })
})
