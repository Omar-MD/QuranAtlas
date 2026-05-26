import { useEffect, useRef, useState } from 'react'

import { OnboardingPageRecipe } from '../../../design-system/recipes/onboarding-page'
import { Badge, Button, Spinner } from '../../../components/ui'
import { openReactDb } from '../../../storage/db'
import { writeOnboardingCompletion } from '../../../storage/settings-writer'
import { isReactProductionDeployment } from '../../deploy-target'
import { canCompleteOnboarding, useOnboardingFlow, type OnboardingSourceOption } from './onboarding-flow'

function SourceChoice({
  option,
  selected,
  onSelect,
}: {
  option: OnboardingSourceOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Button
      aria-pressed={selected}
      className="qar:min-h-11 qar:w-full qar:justify-between qar:text-left"
      disabled={option.disabled}
      onClick={onSelect}
      variant={selected ? 'primary' : 'secondary'}
    >
      <span>{option.label}</span>
      <Badge tone={option.disabled ? 'warning' : selected ? 'success' : 'neutral'}>
        {option.disabled ? 'Unavailable' : selected ? 'Selected' : 'Available'}
      </Badge>
    </Button>
  )
}

export function OnboardingRoute({ onComplete }: { onComplete?: (hash: string) => void } = {}) {
  const { state, dispatch } = useOnboardingFlow()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isTranslationStep = state.step === 'translation'

  useEffect(() => {
    headingRef.current?.focus()
  }, [state.step])

  async function complete() {
    if (!canCompleteOnboarding(state) || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const db = await openReactDb()
      await writeOnboardingCompletion(db, {
        riwayah: state.selectedRiwayah,
        translationId: state.selectedTranslation,
      })
      onComplete?.('#/s/1')
      if (!onComplete) window.location.hash = '#/s/1'
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to complete setup.')
    } finally {
      setSaving(false)
    }
  }

  const options = isTranslationStep ? state.translations : state.riwayat

  return (
    <OnboardingPageRecipe>
      <div className="qar:grid qar:w-full qar:max-w-2xl qar:gap-4 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-5">
        <div>
          <p className="qar:m-0 qar:text-xs qar:text-muted">Reader setup</p>
          <h2 className="qar:m-0 qar:text-2xl qar:leading-tight" ref={headingRef} tabIndex={-1}>
            {isTranslationStep ? 'Choose Translation' : 'Choose Riwayah'}
          </h2>
        </div>
        <p className="qar:m-0 qar:text-sm qar:text-muted">
          {isReactProductionDeployment
            ? 'Choose the baseline source pair before opening reader surfaces.'
            : 'Choose the baseline source pair before the React preview opens reader surfaces.'}
        </p>
        <div className="qar:flex qar:items-center qar:gap-2" role="status">
          <Badge tone="neutral">{isTranslationStep ? 'Step 2 of 2' : 'Step 1 of 2'}</Badge>
          {state.status === 'loading' && <Spinner label="Loading source metadata" />}
          {state.status === 'error' && <Badge tone="warning">Using baseline sources</Badge>}
        </div>
        <div className="qar:grid qar:gap-2" role="group" aria-label={isTranslationStep ? 'Translation choices' : 'Riwayah choices'}>
          {options.map((option) => (
            <SourceChoice
              key={option.id}
              onSelect={() => {
                if (isTranslationStep) dispatch({ type: 'selectTranslation', value: option.id })
                else dispatch({ type: 'selectRiwayah', value: option.id as typeof state.selectedRiwayah })
              }}
              option={option}
              selected={option.id === (isTranslationStep ? state.selectedTranslation : state.selectedRiwayah)}
            />
          ))}
        </div>
        {saveError && <p className="qar:m-0 qar:text-sm qar:text-danger" role="alert">{saveError}</p>}
        <div className="qar:flex qar:flex-wrap qar:gap-2">
          {isTranslationStep && (
            <Button onClick={() => dispatch({ type: 'back' })} size="lg" variant="ghost">
              Back
            </Button>
          )}
          <Button
            disabled={saving || (isTranslationStep && !canCompleteOnboarding(state))}
            onClick={() => {
              if (isTranslationStep) void complete()
              else dispatch({ type: 'next' })
            }}
            size="lg"
            variant="primary"
          >
            {saving ? 'Saving setup' : isTranslationStep ? 'Open Al-Fatihah' : 'Continue'}
          </Button>
        </div>
      </div>
    </OnboardingPageRecipe>
  )
}
