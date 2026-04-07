/**
 * PWA install prompt management.
 * Captures `beforeinstallprompt` and exposes it for the About page.
 */

let deferredPrompt = null

/**
 * Initialize: listen for the browser's install prompt event.
 * Call once during app init.
 */
export function initInstallListener() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
  })
}

/**
 * Get the stored install prompt (if any).
 * @returns {BeforeInstallPromptEvent | null}
 */
export function getInstallPrompt() {
  return deferredPrompt
}

/**
 * Set the install prompt. Used by tests and by initInstallListener.
 * @param {BeforeInstallPromptEvent | null} prompt
 */
export function setInstallPrompt(prompt) {
  deferredPrompt = prompt
}

/**
 * Trigger the install prompt.
 * @returns {Promise<string>} The user's choice outcome ('accepted' | 'dismissed')
 */
export async function promptInstall() {
  if (!deferredPrompt) return 'dismissed'
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome
}
