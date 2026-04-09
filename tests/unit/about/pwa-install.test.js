import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('about/pwa-install.js', () => {
  beforeEach(async () => {
    vi.resetModules()
    const pwaInstall = await import('../../../src/about/pwa-install.js')
    pwaInstall.setInstallPrompt(null)
  })

  it('captures beforeinstallprompt and stores the deferred prompt', async () => {
    const pwaInstall = await import('../../../src/about/pwa-install.js')

    pwaInstall.initInstallListener()

    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    window.dispatchEvent(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(pwaInstall.getInstallPrompt()).toBe(event)
  })

  it('returns dismissed when no prompt is available', async () => {
    const pwaInstall = await import('../../../src/about/pwa-install.js')

    await expect(pwaInstall.promptInstall()).resolves.toBe('dismissed')
  })

  it('prompts the user and clears the stored prompt afterwards', async () => {
    const pwaInstall = await import('../../../src/about/pwa-install.js')
    const prompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    }

    pwaInstall.setInstallPrompt(prompt)

    await expect(pwaInstall.promptInstall()).resolves.toBe('accepted')
    expect(prompt.prompt).toHaveBeenCalledTimes(1)
    expect(pwaInstall.getInstallPrompt()).toBeNull()
  })
})