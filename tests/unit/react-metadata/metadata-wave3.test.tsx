import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MetadataLane } from '../../../src-react/components/reader/metadata/MetadataLane'
import { loadKnowledgeForSurah } from '../../../src-react/metadata/knowledge'

describe('React metadata parity', () => {
  it('returns empty state for missing knowledge shards without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    const result = await loadKnowledgeForSurah(1)
    expect(result.state).toBe('missing')
    expect(result.rows.size).toBe(0)
    vi.unstubAllGlobals()
  })

  it('renders available theme chips and passage context quietly', () => {
    render(<MetadataLane metadata={{ verseKey: '1:1', themes: [{ id: 'mercy', label: 'Mercy' }], passageSummary: 'Opening invocation' }} />)
    expect(screen.getByText('Mercy')).toBeInTheDocument()
    expect(screen.getByText('Opening invocation')).toBeInTheDocument()
  })
})
