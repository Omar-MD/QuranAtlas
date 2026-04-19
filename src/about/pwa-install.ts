/**
 * PWA install prompt management.
 * Captures `beforeinstallprompt` and exposes it for the About page.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): void
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

/**
 * Initialize: listen for the browser's install prompt event.
 * Call once during app init.
 */
export function initInstallListener(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
  })
}

/**
 * Get the stored install prompt (if any).
 */
export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

/**
 * Set the install prompt. Used by tests and by initInstallListener.
 */
export function setInstallPrompt(prompt: BeforeInstallPromptEvent | null): void {
  deferredPrompt = prompt
}

/**
 * Trigger the install prompt.
 * @returns The user's choice outcome ('accepted' | 'dismissed')
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed'> {
  if (!deferredPrompt) { return 'dismissed' }
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome
}
