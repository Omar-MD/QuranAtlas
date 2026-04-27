import { render } from '@testing-library/svelte'
import { describe, it, expect, beforeEach } from 'vitest'
import SurahHeader from '../../../src/reader/SurahHeader.svelte'
import { reader } from '../../../src/state/reader.svelte.ts'
import { settings } from '../../../src/state/settings.svelte.ts'
import type { SurahMeta } from '../../../src/data/dataset.ts'

const meta: SurahMeta = {
  n: 2,
  name: 'Al-Baqarah',
  name_ar: 'البقرة',
  counts: { hafs: 286, warsh: 286, qaloon: 287 },
}

async function flush() { for (let i = 0; i < 5; i++) { await Promise.resolve() } }

describe('SurahHeader.svelte', () => {
  beforeEach(() => {
    settings.riwayah = 'hafs'
    reader.surahHeaderHidden = false
  })

  it('renders meta line with SURAH N · COUNT VERSES (no name)', () => {
    const { container } = render(SurahHeader, { props: { surahNum: 2, meta } })
    const metaEl = container.querySelector('.qa-surah-meta')
    expect(metaEl?.textContent).toBe('SURAH 2 · 286 VERSES')
    expect(metaEl?.textContent).not.toContain('AL-BAQARAH')
  })

  it('renders Arabic name in .qa-surah-name', () => {
    const { container } = render(SurahHeader, { props: { surahNum: 2, meta } })
    const nameEl = container.querySelector('.qa-surah-name')
    expect(nameEl?.textContent?.trim()).toBe('البقرة')
    expect(nameEl?.getAttribute('dir')).toBe('rtl')
    expect(nameEl?.getAttribute('lang')).toBe('ar')
  })

  it('uses 2-col layout: meta column on left, Arabic title on right', () => {
    const { container } = render(SurahHeader, { props: { surahNum: 2, meta } })
    const header = container.querySelector('.qa-surah-header')
    expect(header).not.toBeNull()
    const children = Array.from(header!.children)
    expect(children[0]?.classList.contains('qa-surah-meta-col')).toBe(true)
    expect(children[1]?.classList.contains('qa-surah-name')).toBe(true)
    expect(children[0]?.querySelector('.qa-surah-meta')).not.toBeNull()
    expect(children[0]?.querySelector('.qa-surah-progress')).not.toBeNull()
  })

  it('is not in document when reader.surahHeaderHidden is true', () => {
    reader.surahHeaderHidden = true
    const { container } = render(SurahHeader, { props: { surahNum: 2, meta } })
    expect(container.querySelector('.qa-surah-header')).toBeNull()
  })

  it('re-appears when reader.surahHeaderHidden flips back to false', async () => {
    reader.surahHeaderHidden = true
    const { container } = render(SurahHeader, { props: { surahNum: 2, meta } })
    expect(container.querySelector('.qa-surah-header')).toBeNull()
    reader.surahHeaderHidden = false
    await flush()
    expect(container.querySelector('.qa-surah-header')).not.toBeNull()
  })
})
