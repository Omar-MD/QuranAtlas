import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('about/pwa-install.ts', () => {
  beforeEach(async () => {
    vi.resetModules()
    const pwaInstall = await import('../../../../src/configure/about/pwa-install')
    pwaInstall.setInstallPrompt(null)
  })

  it('captures beforeinstallprompt and stores the deferred prompt', async () => {
    const pwaInstall = await import('../../../../src/configure/about/pwa-install')

    pwaInstall.initInstallListener()

    const event = new Event('beforeinstallprompt')
    event.preventDefault = vi.fn()
    window.dispatchEvent(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(pwaInstall.getInstallPrompt()).toBe(event)
  })

  it('returns dismissed when no prompt is available', async () => {
    const pwaInstall = await import('../../../../src/configure/about/pwa-install')

    await expect(pwaInstall.promptInstall()).resolves.toBe('dismissed')
  })

  it('prompts the user and clears the stored prompt afterwards', async () => {
    const pwaInstall = await import('../../../../src/configure/about/pwa-install')
    const prompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }

    pwaInstall.setInstallPrompt(prompt as unknown as Parameters<typeof pwaInstall.setInstallPrompt>[0])

    await expect(pwaInstall.promptInstall()).resolves.toBe('accepted')
    expect(prompt.prompt).toHaveBeenCalledTimes(1)
    expect(pwaInstall.getInstallPrompt()).toBeNull()
  })
})
