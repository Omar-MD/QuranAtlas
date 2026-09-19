type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Captures the browser install handshake so any surface can offer install.
// `beforeinstallprompt` fires once, early, at an unpredictable moment — the
// listener must be initialized before React renders (main.tsx), never from a
// lazily mounted route. iOS Safari never fires it: there the offer falls back
// to Add to Home Screen steps (getReactInstallPlatform).
let installPrompt: BeforeInstallPromptEvent | null = null
let listening = false
let appInstalled = isRunningStandalone()
const availabilityListeners = new Set<() => void>()

function notifyAvailability(): void {
  for (const listener of availabilityListeners) listener()
}

export function initReactInstallPromptListener() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event as BeforeInstallPromptEvent
    notifyAvailability()
  })
  window.addEventListener('appinstalled', () => {
    installPrompt = null
    appInstalled = true
    notifyAvailability()
  })
}

export function hasReactInstallPrompt() {
  return installPrompt != null
}

export function subscribeReactInstallAvailability(listener: () => void): () => void {
  availabilityListeners.add(listener)
  return () => {
    availabilityListeners.delete(listener)
  }
}

export async function promptReactInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!installPrompt) return 'unavailable'
  const prompt = installPrompt
  installPrompt = null
  notifyAvailability()
  await prompt.prompt()
  const choice = await prompt.userChoice
  return choice.outcome
}

// iOS (and iPadOS, which reports as desktop Safari) offers no install event:
// the only path is Safari's Add to Home Screen flow, offered as steps.
export function getReactInstallPlatform(): 'browser' | 'ios' {
  if (typeof navigator === 'undefined') return 'browser'
  const userAgent = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios'
  return /macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1 ? 'ios' : 'browser'
}

export function isReactAppInstalled(): boolean {
  return appInstalled
}

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true || navigatorWithStandalone.standalone === true
  )
}
