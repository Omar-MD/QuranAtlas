import { useEffect, useState } from 'react'

import { subscribeReactReaderPreferencesChanged } from '../../storage/reader-preferences'
import { Button } from '../ui'
import { readActiveMushafProfile } from '../../storage/reader-settings'
import { readNativeSetting, writeNativeSetting } from '../../storage/native-reader-store'
import { requestReactSettingsOverlay } from '../../app/settings-overlay-events'
import { loadMushafEditionEntries } from '../../launch/mushaf-edition-setup'

const DISMISSED_EDITION_KEY = 'editionBannerDismissedEditionId'

export type EditionBannerState = {
  dismissedEditionId: string | null
  editionId: string
  editionLabel: string
}

// S1 edition banner (approved Step 5): one-shot and dismissible, rendered
// below the chrome bar above the passage. Shows on first launch and re-appears
// once after any edition switch (renamed to the new edition); dismissal is
// persisted per edition. Never blocks reading; not a modal.
export async function readEditionBannerState(): Promise<EditionBannerState | null> {
  const [profile, dismissed, entries] = await Promise.all([
    readActiveMushafProfile(),
    readNativeSetting(DISMISSED_EDITION_KEY).catch(() => undefined),
    loadMushafEditionEntries().catch(() => null),
  ])
  if (dismissed?.value === profile.mushafEditionId) return null
  const label = entries?.find((entry) => entry.mushafEditionId === profile.mushafEditionId)?.label
  // Without the availability index (offline cold start) the banner stays
  // hidden rather than showing a half-named edition; the next online launch
  // offers it again.
  if (!label) return null
  return {
    editionId: profile.mushafEditionId,
    editionLabel: label,
    dismissedEditionId: typeof dismissed?.value === 'string' ? dismissed.value : null,
  }
}

export function dismissEditionBanner(editionId: string): Promise<void> {
  return writeNativeSetting({ key: DISMISSED_EDITION_KEY, value: editionId }).then(() => undefined)
}

// Gate owns the persisted-dismissal wiring; the banner itself is presentational.
export function EditionBannerGate() {
  const [banner, setBanner] = useState<EditionBannerState | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let active = true
    let epoch = 0
    const refresh = () => {
      const currentEpoch = ++epoch
      void readEditionBannerState()
        .then((state) => {
          if (active && epoch === currentEpoch) {
            setBanner(state)
            setHidden(false)
          }
        })
        .catch(() => undefined)
    }
    refresh()
    const unsubscribe = subscribeReactReaderPreferencesChanged(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (!banner || hidden) return null
  return (
    <EditionBanner
      editionLabel={banner.editionLabel}
      onDismiss={() => {
        // Hide only after the dismissal marker commits, so a quick reload
        // never resurrects the banner for the decided session.
        dismissEditionBanner(banner.editionId)
          .catch(() => undefined)
          .then(() => setHidden(true))
      }}
    />
  )
}

export function EditionBanner({ editionLabel, onDismiss }: { editionLabel: string; onDismiss: () => void }) {
  return (
    <aside aria-label="Current edition" className="qar-edition-banner" data-edition-banner="true">
      <p className="qar-eyebrow qar-eyebrow--accent qar:m-0">Current edition</p>
      <p className="qar:m-0 qar:text-sm qar:leading-6">You're reading the {editionLabel} edition</p>
      <div className="qar-edition-banner-actions">
        <Button
          onClick={() => {
            requestReactSettingsOverlay('mushaf', 'edition-banner-change')
          }}
          size="sm"
          variant="secondary"
        >
          Change edition
        </Button>
        <Button onClick={onDismiss} size="sm" variant="ghost">
          Dismiss
        </Button>
      </div>
    </aside>
  )
}
