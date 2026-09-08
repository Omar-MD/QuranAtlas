import { AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useReducer, useRef } from 'react'

import { Button, SegmentedControl, Spinner, Status } from '../../../components/ui'
import { LaunchSplash } from '../../../components/launch/LaunchSplash'
import { OnboardingPageRecipe } from '../../../design-system/recipes/onboarding-page'
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
  setup?: Exclude<MushafEditionSetupState, { status: 'complete' }>
  writeSelection?: typeof writeMushafEditionSelection
}) {
  if (!setup) return <LaunchSplash />
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
              ref={retryRef}
              onClick={() => {
                if (onRetryAvailability) onRetryAvailability()
                else window.location.reload()
              }}
              variant="secondary"
            >
              Retry edition availability
            </Button>
          }
          description="Could not check Mushaf edition availability. Try again without clearing your saved edition."
          title="Edition availability is temporarily unavailable"
          tone="error"
          icon={<AlertTriangle aria-hidden="true" size={18} />}
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
          title="Your selected Mushaf edition is no longer available"
          tone="error"
          icon={<AlertTriangle aria-hidden="true" size={18} />}
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
              ref={retryRef}
              onClick={() => {
                if (onRetryAvailability) onRetryAvailability()
                else window.location.reload()
              }}
              variant="secondary"
            >
              Retry availability
            </Button>
          }
          description="Connect to the internet and retry to load available editions."
          title="No Mushaf editions are available"
          tone="warning"
          icon={<AlertTriangle aria-hidden="true" size={18} />}
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
              ref={retryRef}
              disabled={!canContinue}
              onClick={() => {
                if (state.selectedEditionId) void complete(state.selectedEditionId)
              }}
              variant="secondary"
            >
              Retry save
            </Button>
          }
          description="Your selected edition is preserved. Retry saving to finish setup."
          title="Could not save Mushaf setup"
          tone="error"
          icon={<AlertTriangle aria-hidden="true" size={18} />}
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
