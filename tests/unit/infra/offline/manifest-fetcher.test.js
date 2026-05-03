import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchManifest } from '../../../../src/infra/offline/manifest-fetcher.js'

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
    expect(fetch).toHaveBeenCalledWith(
      '/dataset/manifest.json',
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      })
    )
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

  it('aborts fetch after 10 seconds', async () => {
    vi.useFakeTimers()

    globalThis.fetch = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        reject(new Error('aborted'))
      })
    }))

    const promise = fetchManifest()
    const rejection = expect(promise).rejects.toThrow('aborted')

    await vi.advanceTimersByTimeAsync(10_001)
    await rejection

    vi.useRealTimers()
  })
})
