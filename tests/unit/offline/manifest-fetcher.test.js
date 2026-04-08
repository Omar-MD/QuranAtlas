import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchManifest } from '../../../src/offline/manifest-fetcher.js'

describe('manifest-fetcher.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed manifest on successful fetch', async () => {
    const manifest = {
      packageVersion: '1.1.0',
      files: [
        { url: '/dataset/surah-1.json', sha256: 'abc123' },
      ],
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    })

    const result = await fetchManifest()
    expect(result).toEqual(manifest)
    expect(fetch).toHaveBeenCalledWith('/dataset/manifest.json', { cache: 'no-store' })
  })

  it('throws on non-200 response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(fetchManifest()).rejects.toThrow('Manifest fetch failed: 500')
  })

  it('throws on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(fetchManifest()).rejects.toThrow('Network error')
  })
})
