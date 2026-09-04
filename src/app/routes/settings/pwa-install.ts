type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installPrompt: BeforeInstallPromptEvent | null = null
let listening = false

export function initReactInstallPromptListener() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event as BeforeInstallPromptEvent
  })
}

export function hasReactInstallPrompt() {
  return installPrompt != null
}

export async function promptReactInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!installPrompt) return 'unavailable'
  const prompt = installPrompt
  installPrompt = null
  await prompt.prompt()
  const choice = await prompt.userChoice
  return choice.outcome
}
