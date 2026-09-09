import { AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import { LaunchSplash } from '../../../components/launch/LaunchSplash'
import { Badge, Button, Progress, SegmentedControl, Spinner, Status } from '../../../components/ui'
import type { LaunchSetupState } from '../../../continuity/launch-restore'
import { OnboardingPageRecipe } from '../../../design-system/recipes/onboarding-page'
import { readerCorePackId } from '../../../offline/download/offline-pack-plan'
import {
  getOfflineDownloadSnapshot,
  pauseOfflinePack,
  resumeOfflinePack,
  subscribeOfflineDownloads,
  type OfflineDownloadSnapshotItem,
} from '../../../offline/download/offline-pack-downloader'
import { ensureStoragePersistence } from '../../../offline/download/storage-persistence'
import {
  formatOfflinePackSize,
  startOfflineDownloadFromOnboarding,
  writeOfflineDownloadSetupComplete,
  type OfflineDownloadOffer,
} from '../../../launch/offline-download-setup'
import { writeMushafEditionSelection, type MushafEditionSetupState } from '../../../launch/mushaf-edition-setup'
import {
  canContinueMushafEditionSetup,
  createInitialMushafEditionSetupState,
  mushafEditionSetupReducer,
} from './onboarding-flow'

export function OnboardingRoute({
  onComplete,
  onRetryAvailability,
  pendingHash = '#/s/1',
  setup,
  writeSelection = writeMushafEditionSelection,
}: {
  onComplete?: (hash: string) => void
  onRetryAvailability?: () => void
  pendingHash?: string
  setup?: LaunchSetupState
  writeSelection?: typeof writeMushafEditionSelection
}) {
  if (!setup) return <LaunchSplash />
  if (setup.status === 'offer') {
    return <OfflineDownloadRoute onComplete={onComplete} pendingHash={pendingHash} setup={setup} />
  }
  return (
    <MushafEditionSetupRoute
      onComplete={onComplete}
      onRetryAvailability={onRetryAvailability}
      pendingHash={pendingHash}
      setup={setup}
      writeSelection={writeSelection}
    />
  )
}

function OfflineDownloadRoute({
  onComplete,
  pendingHash,
  setup,
}: {
  onComplete?: (hash: string) => void
  pendingHash: string
  setup: OfflineDownloadOffer
}) {
  const [step, setStep] = useState<'offer' | 'downloading'>('offer')
  const [consentFailed, setConsentFailed] = useState(false)
  const [persistenceDenied, setPersistenceDenied] = useState(false)
  const [snapshot, setSnapshot] = useState<OfflineDownloadSnapshotItem[]>(getOfflineDownloadSnapshot)
  const continueRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => subscribeOfflineDownloads(setSnapshot), [])

  useEffect(() => {
    if (step === 'downloading') continueRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (consentFailed) retryRef.current?.focus()
  }, [consentFailed])

  const readerPackId = readerCorePackId(setup.profile)
  const mushafPackId = setup.mushafPlan.packId
  const readerItem = snapshot.find((item) => item.packId === readerPackId)
  const mushafItem = snapshot.find((item) => item.packId === mushafPackId)
  const bothTracked = readerItem != null && mushafItem != null
  const bothInstalled = readerItem?.status === 'installed' && mushafItem?.status === 'installed'
  const anyPaused =
    readerItem?.status === 'paused-user' ||
    readerItem?.status === 'paused-network' ||
    mushafItem?.status === 'paused-user' ||
    mushafItem?.status === 'paused-network'

  const startDownload = useCallback(async () => {
    setConsentFailed(false)
    try {
      const { persisted } = await startOfflineDownloadFromOnboarding(setup)
      await writeOfflineDownloadSetupComplete()
      setPersistenceDenied(!persisted)
      setStep('downloading')
    } catch {
      setConsentFailed(true)
    }
  }, [setup])

  const skipDownload = useCallback(async () => {
    try {
      await writeOfflineDownloadSetupComplete()
    } catch {
      // Silent: the boot migration path rewrites the marker next session.
    }
    onComplete?.(pendingHash)
    if (!onComplete) window.location.hash = pendingHash
  }, [onComplete, pendingHash])

  const continueReading = useCallback(() => {
    onComplete?.(pendingHash)
    if (!onComplete) window.location.hash = pendingHash
  }, [onComplete, pendingHash])

  const togglePause = useCallback(async () => {
    if (anyPaused) {
      // User-activated consent boundary (may prompt in Firefox).
      await ensureStoragePersistence()
      await Promise.all([resumeOfflinePack(readerPackId), resumeOfflinePack(mushafPackId)])
    } else {
      await Promise.all([pauseOfflinePack(readerPackId), pauseOfflinePack(mushafPackId)])
    }
  }, [anyPaused, mushafPackId, readerPackId])

  if (step === 'offer') {
    return (
      <OnboardingPageRecipe kicker="QuranAtlas" title="Download for offline reading">
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          Your reader texts are saved to this device automatically. Add the complete Mushaf pages to keep reading
          without a connection.
        </p>
        <div className="qar:grid qar:gap-1">
          <p className="qar:m-0 qar:text-sm qar:text-text">
            Complete Mushaf ·{' '}
            <span className="qar:text-muted">{formatOfflinePackSize(setup.mushafPlan.totalBytes)}</span>
          </p>
        </div>
        {consentFailed ? (
          <Status
            action={
              <Button
                onClick={() => {
                  void startDownload()
                }}
                ref={retryRef}
                variant="secondary"
              >
                Retry download
              </Button>
            }
            description="The download could not be started. Check your connection and try again."
            icon={<AlertTriangle aria-hidden="true" size={18} />}
            title="Connect to the internet to download"
            tone="warning"
          />
        ) : null}
        <div className="qar:grid qar:gap-2">
          <Button
            onClick={() => {
              void startDownload()
            }}
            variant="primary"
          >
            Download for offline reading
          </Button>
          <Button
            onClick={() => {
              void skipDownload()
            }}
            variant="secondary"
          >
            Skip for now
          </Button>
        </div>
      </OnboardingPageRecipe>
    )
  }

  // Known-bytes bar (SD-6): sums cover only packs whose totalBytes is known;
  // the count line carries progress for unknown-size packs.
  const knownItems = [readerItem, mushafItem].filter(
    (item): item is OfflineDownloadSnapshotItem => item != null && item.totalBytes != null,
  )
  const sumKnownBytes = knownItems.reduce((total, item) => total + (item.totalBytes ?? 0), 0)
  const sumDoneBytes = knownItems.reduce((total, item) => total + item.bytesDone, 0)
  const progressValue = sumKnownBytes > 0 ? Math.min(100, Math.round((100 * sumDoneBytes) / sumKnownBytes)) : 0
  const filesDone = (readerItem?.filesDone ?? 0) + (mushafItem?.filesDone ?? 0)
  const fileCount = (readerItem?.fileCount ?? 0) + (mushafItem?.fileCount ?? 0)

  return (
    <OnboardingPageRecipe kicker="QuranAtlas" title="Download for offline reading">
      {bothInstalled ? (
        <Badge tone="success">Downloaded</Badge>
      ) : (
        <>
          <Progress label="Downloading offline reading data" value={progressValue} />
          {bothTracked ? (
            <p className="qar:m-0 qar:text-sm qar:text-muted">
              {filesDone} of {fileCount} files
            </p>
          ) : null}
          {persistenceDenied ? (
            <p className="qar:m-0 qar:text-sm qar:text-muted">
              Your browser may remove downloaded data under storage pressure.
            </p>
          ) : null}
        </>
      )}
      <div className="qar:grid qar:gap-2">
        <Button onClick={continueReading} ref={continueRef} variant="primary">
          Continue reading
        </Button>
        {bothInstalled ? null : (
          <Button
            disabled={!bothTracked}
            onClick={() => {
              void togglePause()
            }}
            variant="secondary"
          >
            {anyPaused ? 'Resume download' : 'Pause download'}
          </Button>
        )}
      </div>
    </OnboardingPageRecipe>
  )
}

function MushafEditionSetupRoute({
  onComplete,
  onRetryAvailability,
  pendingHash,
  setup,
  writeSelection,
}: {
  onComplete?: (hash: string) => void
  onRetryAvailability?: () => void
  pendingHash: string
  setup: Exclude<MushafEditionSetupState, { status: 'complete' }>
  writeSelection: typeof writeMushafEditionSelection
}) {
  const [state, dispatch] = useReducer(
    (current, action) =>
      setup.status === 'choose' ? mushafEditionSetupReducer(current, action, setup.editions) : current,
    setup.status === 'choose' ? setup.editions : [],
    createInitialMushafEditionSetupState,
  )
  const autoSelected = useRef<string | null>(null)
  const retryRef = useRef<HTMLButtonElement>(null)

  const complete = useCallback(
    async (editionId: string) => {
      dispatch({ type: 'startPersistence' })
      try {
        await writeSelection(editionId)
      } catch {
        dispatch({ type: 'persistenceFailed' })
        return
      }
      dispatch({ type: 'persistenceSucceeded' })
      onComplete?.(pendingHash)
      if (!onComplete) window.location.hash = pendingHash
    },
    [onComplete, pendingHash, writeSelection],
  )

  useEffect(() => {
    if (setup.status !== 'choose' || setup.editions.length !== 1) return
    const editionId = setup.editions[0]?.id
    if (!editionId || autoSelected.current === editionId) return
    autoSelected.current = editionId
    void complete(editionId)
  }, [complete, setup])

  useEffect(() => {
    if (state.persistenceStatus === 'error') retryRef.current?.focus()
  }, [state.persistenceStatus])

  if (setup.status === 'availability-error') {
    return (
      <OnboardingPageRecipe kicker="QuranAtlas" title="Mushaf setup">
        <Status
          action={
            <Button
              onClick={() => {
                if (onRetryAvailability) onRetryAvailability()
                else window.location.reload()
              }}
              ref={retryRef}
              variant="secondary"
            >
              Retry edition availability
            </Button>
          }
          description="Could not check Mushaf edition availability. Try again without clearing your saved edition."
          icon={<AlertTriangle aria-hidden="true" size={18} />}
          title="Edition availability is temporarily unavailable"
          tone="error"
        />
      </OnboardingPageRecipe>
    )
  }

  if (setup.status === 'missing') {
    return (
      <OnboardingPageRecipe kicker="QuranAtlas" title="Mushaf setup">
        <Status
          action={
            <Button onClick={() => (window.location.hash = '#/about')} variant="secondary">
              Go to About
            </Button>
          }
          description="Open About to clear saved data and choose an available edition."
          icon={<AlertTriangle aria-hidden="true" size={18} />}
          title="Your selected Mushaf edition is no longer available"
          tone="error"
        />
      </OnboardingPageRecipe>
    )
  }

  if (setup.editions.length === 0) {
    return (
      <OnboardingPageRecipe kicker="QuranAtlas" title="Mushaf setup">
        <Status
          action={
            <Button
              onClick={() => {
                if (onRetryAvailability) onRetryAvailability()
                else window.location.reload()
              }}
              ref={retryRef}
              variant="secondary"
            >
              Retry availability
            </Button>
          }
          description="Connect to the internet and retry to load available editions."
          icon={<AlertTriangle aria-hidden="true" size={18} />}
          title="No Mushaf editions are available"
          tone="warning"
        />
      </OnboardingPageRecipe>
    )
  }

  const canContinue = canContinueMushafEditionSetup(state, setup.editions)
  const writing = state.persistenceStatus === 'saving'
  const persistenceFailed = state.persistenceStatus === 'error'
  return (
    <OnboardingPageRecipe kicker="QuranAtlas" title="Choose your Mushaf edition">
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Select the edition you want to use for your reader.
      </p>
      <SegmentedControl
        label="Mushaf edition"
        onValueChange={(value) => dispatch({ type: 'selectMushafEdition', value })}
        options={setup.editions.map((edition) => ({
          label: edition.label,
          shortLabel: edition.shortLabel,
          value: edition.id,
        }))}
        value={state.selectedEditionId ?? undefined}
      />
      {writing && <Spinner label="Saving Mushaf setup" />}
      {persistenceFailed && (
        <Status
          action={
            <Button
              disabled={!canContinue}
              onClick={() => {
                if (state.selectedEditionId) void complete(state.selectedEditionId)
              }}
              ref={retryRef}
              variant="secondary"
            >
              Retry save
            </Button>
          }
          description="Your selected edition is preserved. Retry saving to finish setup."
          icon={<AlertTriangle aria-hidden="true" size={18} />}
          title="Could not save Mushaf setup"
          tone="error"
        />
      )}
      <Button
        disabled={!canContinue || writing || persistenceFailed}
        onClick={() => {
          if (state.selectedEditionId) void complete(state.selectedEditionId)
        }}
        variant="primary"
      >
        Continue
      </Button>
    </OnboardingPageRecipe>
  )
}
