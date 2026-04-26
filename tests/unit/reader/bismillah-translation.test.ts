import { render } from '@testing-library/svelte'
import { describe, it, expect, beforeEach } from 'vitest'
import SurahHeader from '../../../src/reader/SurahHeader.svelte'
import { reader } from '../../../src/state/reader.svelte.ts'
import { settings } from '../../../src/state/settings.svelte.ts'
import type { SurahMeta } from '../../../src/data/dataset.ts'

const meta = (n: number, name: string, name_ar: string, count: number): SurahMeta => ({
  n, name, name_ar,
  counts: { hafs: count, warsh: count, qaloon: count },
})

describe('Bismillah translation', () => {
  beforeEach(() => {
    settings.riwayah = 'hafs'
    reader.surahHeaderHidden = false
  })

  it('surah 2 renders the bismillah block + English translation', () => {
    const { container } = render(SurahHeader, {
      props: { surahNum: 2, meta: meta(2, 'Al-Baqarah', 'البقرة', 286) },
    })
    expect(container.querySelector('.qa-basmala')).not.toBeNull()
    expect(container.querySelector('.qa-basmala-text')).not.toBeNull()
    const tr = container.querySelector('.qa-basmala-translation')
    expect(tr).not.toBeNull()
    expect(tr?.textContent?.trim()).toBe(
      'In the Name of Allah — the Most Compassionate, Most Merciful'
    )
  })

  it('surah 1 renders neither the bismillah block nor the translation', () => {
    const { container } = render(SurahHeader, {
      props: { surahNum: 1, meta: meta(1, 'Al-Fatihah', 'الفاتحة', 7) },
    })
    expect(container.querySelector('.qa-basmala')).toBeNull()
    expect(container.querySelector('.qa-basmala-translation')).toBeNull()
  })

  it('surah 9 renders neither the bismillah block nor the translation', () => {
    const { container } = render(SurahHeader, {
      props: { surahNum: 9, meta: meta(9, 'At-Tawbah', 'التوبة', 129) },
    })
    expect(container.querySelector('.qa-basmala')).toBeNull()
    expect(container.querySelector('.qa-basmala-translation')).toBeNull()
  })

  it('translation is independent of settings.translationVisible (always rendered when basmala renders)', () => {
    settings.translationVisible = false
    const { container } = render(SurahHeader, {
      props: { surahNum: 2, meta: meta(2, 'Al-Baqarah', 'البقرة', 286) },
    })
    expect(container.querySelector('.qa-basmala-translation')).not.toBeNull()
    settings.translationVisible = true
  })

  it('bismillah still renders when surah header is hidden (header toggle does not affect basmala)', () => {
    reader.surahHeaderHidden = true
    const { container } = render(SurahHeader, {
      props: { surahNum: 2, meta: meta(2, 'Al-Baqarah', 'البقرة', 286) },
    })
    expect(container.querySelector('.qa-surah-header')).toBeNull()
    expect(container.querySelector('.qa-basmala')).not.toBeNull()
    expect(container.querySelector('.qa-basmala-translation')).not.toBeNull()
  })
})
