import { useEffect, useState, useSyncExternalStore } from 'react'

import { Button, Dialog } from '../ui'
import {
  getReactInstallPlatform,
  hasReactInstallPrompt,
  initReactInstallPromptListener,
  isReactAppInstalled,
  promptReactInstall,
  subscribeReactInstallAvailability,
} from '../../launch/pwa-install'
import { SettingsRow } from './SettingsRow'

// The Add to Home Screen steps are shared by the first-run offer
// (InstallAppPrompt) and this section's iOS dialog.
export function AddToHomeScreenSteps() {
  return (
    <ol className="qar:m-0 qar:grid qar:list-decimal qar:gap-2 qar:pl-5 qar:text-sm qar:leading-6 qar:text-muted qar:marker:text-muted">
      <li>In Safari, tap the Share button — the square with an arrow pointing up.</li>
      <li>Scroll down and tap Add to Home Screen.</li>
      <li>Tap Add.</li>
    </ol>
  )
}

// Persistent install entry points. Settings renders the bare row inside the
// "App" group (primary location — one tap from the reader on every platform);
// About keeps a quiet secondary button. Chrome-like browsers trigger the
// native install prompt; iOS Safari opens the Add to Home Screen steps.
export function InstallAppSection({ placement }: { placement: 'about' | 'settings' }) {
  const canPrompt = useSyncExternalStore(subscribeReactInstallAvailability, hasReactInstallPrompt, () => false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [installDone, setInstallDone] = useState(false)

  useEffect(() => {
    initReactInstallPromptListener()
  }, [])

  const ios = getReactInstallPlatform() === 'ios'
  if (isReactAppInstalled()) return null
  // Chrome-like browsers surface the entry while the native prompt is
  // available, and keep a disabled "Installed" confirmation after an accepted
  // install; a dismissed native prompt hides the entry. iOS always gets the
  // steps path.
  if (!ios && !installDone && !canPrompt) return null

  async function handleInstall() {
    if (ios) {
      setInstructionsOpen(true)
      return
    }
    const outcome = await promptReactInstall()
    setInstallDone(outcome === 'accepted')
  }

  const actionLabel = installDone ? 'Installed' : ios ? 'Add to Home Screen' : 'Install app'

  const button = (
    <Button
      aria-label="Install QuranAtlas to your home screen"
      disabled={installDone}
      onClick={() => {
        void handleInstall()
      }}
      size={placement === 'settings' ? 'sm' : undefined}
      variant="secondary"
    >
      {actionLabel}
    </Button>
  )

  return (
    <>
      {placement === 'settings' ? (
        <SettingsRow helper="Add QuranAtlas to your home screen for offline reading." label="Install app">
          {button}
        </SettingsRow>
      ) : (
        <div>{button}</div>
      )}
      {ios ? (
        <Dialog onOpenChange={setInstructionsOpen} open={instructionsOpen} title="Add QuranAtlas to your Home Screen">
          <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">QuranAtlas installs as an app from Safari:</p>
          <AddToHomeScreenSteps />
          <Button onClick={() => setInstructionsOpen(false)} variant="primary">
            Got it
          </Button>
        </Dialog>
      ) : null}
    </>
  )
}
