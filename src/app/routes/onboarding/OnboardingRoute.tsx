import { useEffect, useReducer, useRef } from 'react'

import { Button, Select } from '../../../components/ui'
import { LaunchSplash } from '../../../components/launch/LaunchSplash'
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
    (current, action) => setup.status === 'choose'
      ? mushafEditionSetupReducer(current, action, setup.editions)
      : current,
    setup.status === 'choose' ? setup.editions : [],
    createInitialMushafEditionSetupState,
  )
  const autoSelected = useRef<string | null>(null)

  async function complete(editionId: string) {
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
  }

  useEffect(() => {
    if (setup.status !== 'choose' || setup.editions.length !== 1) return
    const editionId = setup.editions[0]?.id
    if (!editionId || autoSelected.current === editionId) return
    autoSelected.current = editionId
    void complete(editionId)
  }, [setup])

  if (setup.status === 'availability-error') {
    return (
      <main aria-label="Mushaf edition availability" className="qar:grid qar:mx-auto qar:min-h-screen qar:w-full qar:max-w-xl qar:content-center qar:gap-4 qar:px-5 qar:py-8">
        <h1 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">Mushaf edition availability is temporarily unavailable.</h1>
        <p aria-live="polite" className="qar:m-0 qar:text-sm qar:leading-6 qar:text-danger" role="status">Could not check Mushaf edition availability. Try again without clearing your saved edition.</p>
        <div><Button onClick={() => {
          if (onRetryAvailability) onRetryAvailability()
          else window.location.reload()
        }} variant="primary">Retry edition availability</Button></div>
      </main>
    )
  }

  if (setup.status === 'missing') {
    return (
      <main aria-label="Mushaf edition unavailable" className="qar:grid qar:mx-auto qar:min-h-screen qar:w-full qar:max-w-xl qar:content-center qar:gap-4 qar:px-5 qar:py-8">
        <p className="qar:m-0 qar:text-sm qar:font-medium qar:text-muted">Mushaf edition unavailable</p>
        <h1 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">Your selected Mushaf edition is no longer available.</h1>
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">Open About to use Clear All Data and choose an available edition.</p>
        <div><Button onClick={() => { window.location.hash = '#/about' }} variant="primary">Go to About</Button></div>
      </main>
    )
  }

  if (setup.editions.length === 0) {
    return (
      <main aria-label="Mushaf edition setup" className="qar:grid qar:mx-auto qar:min-h-screen qar:w-full qar:max-w-xl qar:content-center qar:gap-4 qar:px-5 qar:py-8">
        <h1 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">Mushaf editions are unavailable.</h1>
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">Connect to the internet and reopen QuranAtlas to load available editions.</p>
      </main>
    )
  }

  const canContinue = canContinueMushafEditionSetup(state, setup.editions)
  const writing = state.persistenceStatus === 'saving'
  const persistenceFailed = state.persistenceStatus === 'error'
  return (
    <main aria-label="Mushaf edition setup" className="qar:grid qar:mx-auto qar:min-h-screen qar:w-full qar:max-w-xl qar:content-center qar:gap-5 qar:px-5 qar:py-8">
      <div className="qar:grid qar:gap-2">
        <p className="qar:m-0 qar:text-sm qar:font-medium qar:text-muted">Reader setup</p>
        <h1 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">Choose your Mushaf edition</h1>
      </div>
      {setup.editions.length > 1 && (
        <Select
          label="Mushaf edition"
          onValueChange={(value) => dispatch({ type: 'selectMushafEdition', value })}
          options={setup.editions.map((edition) => ({ label: edition.label, value: edition.id }))}
          placeholder="Choose an edition"
          value={state.selectedEditionId ?? undefined}
        />
      )}
      {persistenceFailed && (
        <p aria-live="polite" className="qar:m-0 qar:text-sm qar:leading-6 qar:text-danger" role="status">Could not save Mushaf setup. Your selected edition is preserved.</p>
      )}
      <div><Button disabled={!canContinue || writing} onClick={() => { if (state.selectedEditionId) void complete(state.selectedEditionId) }} variant="primary">{writing ? 'Saving...' : persistenceFailed ? 'Retry Mushaf setup' : 'Continue'}</Button></div>
    </main>
  )
}
