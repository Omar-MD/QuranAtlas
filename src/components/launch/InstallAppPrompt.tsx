import { useEffect, useState, useSyncExternalStore } from 'react'

import { shouldOfferInstallPrompt, writeInstallPromptResolved } from '../../launch/install-prompt-setup'
import {
  getReactInstallPlatform,
  hasReactInstallPrompt,
  initReactInstallPromptListener,
  isReactAppInstalled,
  promptReactInstall,
  subscribeReactInstallAvailability,
} from '../../launch/pwa-install'
import { AddToHomeScreenSteps } from '../settings/InstallAppSection'
import { Button, Dialog, Sheet } from '../ui'

// First-run install offer, one popup per device, on the OfflineOfferPrompt
// grammar — desktop Dialog, mobile bottom sheet — rendered above the reader.
// It waits for the offline offer to clear and never opens over another
// overlay. Chrome-like browsers trigger the native install prompt directly;
// iOS Safari gets Add to Home Screen steps.
const INSTALL_OFFER_DELAY_MS = 8000

export function InstallAppPrompt({
  interactionSuspended,
  offlineOfferVisible,
  readerReady,
}: {
  interactionSuspended: boolean
  offlineOfferVisible: boolean
  readerReady: boolean
}) {
  const canPrompt = useSyncExternalStore(subscribeReactInstallAvailability, hasReactInstallPrompt, () => false)
  const [offerAllowed, setOfferAllowed] = useState(false)
  const [visible, setVisible] = useState(false)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    initReactInstallPromptListener()
    let active = true
    void shouldOfferInstallPrompt().then((allowed) => {
      if (active) setOfferAllowed(allowed)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!readerReady || !offerAllowed || resolved || visible) return
    if (interactionSuspended || offlineOfferVisible) return
    if (isReactAppInstalled()) return
    if (getReactInstallPlatform() !== 'ios' && !canPrompt) return
    const timer = window.setTimeout(() => setVisible(true), INSTALL_OFFER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [canPrompt, interactionSuspended, offlineOfferVisible, offerAllowed, readerReady, resolved, visible])

  async function resolveOffer() {
    // Resolve before hiding so a reload mid-transition never resurrects the offer.
    await writeInstallPromptResolved().catch(() => undefined)
    setResolved(true)
    setVisible(false)
  }

  async function handleInstall() {
    await promptReactInstall()
    await resolveOffer()
  }

  if (!visible || resolved) return null

  const ios = getReactInstallPlatform() === 'ios'
  const title = ios ? 'Add QuranAtlas to your Home Screen' : 'Install QuranAtlas'
  const body = ios ? (
    <>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Add QuranAtlas to your Home Screen for a distraction-free, full-screen reading experience:
      </p>
      <AddToHomeScreenSteps />
      <Button
        onClick={() => {
          void resolveOffer()
        }}
        variant="primary"
      >
        Got it
      </Button>
    </>
  ) : (
    <>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Install QuranAtlas as an app for a distraction-free, full-screen reading experience. It keeps working offline.
      </p>
      <div className="qar:grid qar:gap-2">
        <Button
          aria-label="Install QuranAtlas to your home screen"
          onClick={() => {
            void handleInstall()
          }}
          variant="primary"
        >
          Install app
        </Button>
        <Button
          onClick={() => {
            void resolveOffer()
          }}
          variant="secondary"
        >
          Not now
        </Button>
      </div>
    </>
  )

  if (isDesktopViewport()) {
    return (
      <Dialog
        onOpenChange={(open) => {
          if (!open) void resolveOffer()
        }}
        open
        title={title}
      >
        {body}
      </Dialog>
    )
  }
  return (
    <Sheet
      closeLabel="Not now"
      onOpenChange={(open) => {
        if (!open) void resolveOffer()
      }}
      open
      title={title}
    >
      {body}
    </Sheet>
  )
}

function isDesktopViewport(): boolean {
  return typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 768px)').matches
}
