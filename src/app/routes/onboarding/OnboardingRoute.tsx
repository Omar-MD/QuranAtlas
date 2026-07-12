import { useEffect, useReducer, useRef, useState } from 'react'

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
  pendingHash = '#/s/1',
  setup,
}: {
  onComplete?: (hash: string) => void
  pendingHash?: string
  setup?: Exclude<MushafEditionSetupState, { status: 'complete' }>
}) {
  if (!setup) return <LaunchSplash />
  return <MushafEditionSetupRoute onComplete={onComplete} pendingHash={pendingHash} setup={setup} />
}

function MushafEditionSetupRoute({
  onComplete,
  pendingHash,
  setup,
}: {
  onComplete?: (hash: string) => void
  pendingHash: string
  setup: Exclude<MushafEditionSetupState, { status: 'complete' }>
}) {
  const [state, dispatch] = useReducer(
    (current, action) => setup.status === 'choose'
      ? mushafEditionSetupReducer(current, action, setup.editions)
      : current,
    setup.status === 'choose' ? setup.editions : [],
    createInitialMushafEditionSetupState,
  )
  const [writing, setWriting] = useState(false)
  const autoSelected = useRef<string | null>(null)

  async function complete(editionId: string) {
    setWriting(true)
    try {
      await writeMushafEditionSelection(editionId)
      onComplete?.(pendingHash)
      if (!onComplete) window.location.hash = pendingHash
    } finally {
      setWriting(false)
    }
  }

  useEffect(() => {
    if (setup.status !== 'choose' || setup.editions.length !== 1) return
    const editionId = setup.editions[0]?.id
    if (!editionId || autoSelected.current === editionId) return
    autoSelected.current = editionId
    void complete(editionId)
  }, [setup])

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
      <div><Button disabled={!canContinue || writing} onClick={() => { if (state.selectedEditionId) void complete(state.selectedEditionId) }} variant="primary">{writing ? 'Saving...' : 'Continue'}</Button></div>
    </main>
  )
}
