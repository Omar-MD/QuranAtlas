import { SegmentedControl, Slider, Switch } from '../ui'
import type { ReactPreferenceStep } from '../../storage/settings-writer'

const ARABIC_STEPS: ReactPreferenceStep[] = ['xs', 'sm', 'md', 'lg', 'xl']
const TRANSLATION_STEPS: ReactPreferenceStep[] = ['xs', 'sm', 'md', 'lg', 'xl']

const SPACING_OPTIONS = [
  { label: 'Compact', value: 'xs' },
  { label: 'Comfortable', value: 'md' },
  { label: 'Spacious', value: 'xl' },
]

function stepLabel(value: ReactPreferenceStep, index: number, count: number): string {
  if (index <= 0) return 'Smallest'
  if (index >= count - 1) return 'Largest'
  return { xs: 'Smallest', sm: 'Small', md: 'Default', lg: 'Large', xl: 'Largest' }[value] ?? 'Default'
}

function SizeStepControl({
  label,
  onChange,
  steps,
  value,
}: {
  label: string
  onChange: (value: ReactPreferenceStep) => void
  steps: ReactPreferenceStep[]
  value: ReactPreferenceStep
}) {
  const index = Math.max(0, steps.indexOf(value))
  return (
    <div className="qar-react-settings-row qar-react-settings-row--font-size">
      <span className="qar-react-settings-row-copy">
        <span className="qar-react-settings-row-label">{label}</span>
        <span className="qar-react-settings-row-control">{stepLabel(value, index, steps.length)}</span>
      </span>
      <div className="qar-react-settings-font-slider">
        <span aria-hidden="true" className="qar-react-settings-font-size-mark qar-react-settings-font-size-mark--small">
          A
        </span>
        <Slider
          className="qar-react-settings-font-size-slider"
          hideLabel
          label={label}
          max={steps.length - 1}
          min={0}
          onValueChange={([nextValue]) => onChange(steps[nextValue ?? 2] ?? 'md')}
          step={1}
          value={[index]}
        />
        <span aria-hidden="true" className="qar-react-settings-font-size-mark qar-react-settings-font-size-mark--large">
          A
        </span>
      </div>
    </div>
  )
}

// S8 Reading section (verse view) — shared by the settings shell and the S3
// adjustments sheet. One label per control; the same controls render in both
// surfaces with the same labels.
export function VerseReadingControls({
  fontSize,
  onFontSizeChange,
  onTranslationFontSizeChange,
  onVerseSpacingChange,
  onWirdVisibleChange,
  showContinuityToggle = false,
  translationFontSize,
  verseSpacing,
  wirdVisible,
}: {
  fontSize: ReactPreferenceStep
  onFontSizeChange: (value: ReactPreferenceStep) => void
  onTranslationFontSizeChange: (value: ReactPreferenceStep) => void
  onVerseSpacingChange: (value: ReactPreferenceStep) => void
  onWirdVisibleChange?: (value: boolean) => void
  showContinuityToggle?: boolean
  translationFontSize: ReactPreferenceStep
  verseSpacing: ReactPreferenceStep
  wirdVisible?: boolean
}) {
  return (
    <div className="qar-react-settings-panel-controls">
      <SizeStepControl label="Arabic size" onChange={onFontSizeChange} steps={ARABIC_STEPS} value={fontSize} />
      <SizeStepControl
        label="Translation size"
        onChange={onTranslationFontSizeChange}
        steps={TRANSLATION_STEPS}
        value={translationFontSize}
      />
      <div className="qar-react-settings-row">
        <span className="qar-react-settings-row-copy">
          <span className="qar-react-settings-row-label">Verse spacing</span>
        </span>
        <SegmentedControl
          label="Verse spacing"
          onValueChange={(value) => onVerseSpacingChange(value as ReactPreferenceStep)}
          options={SPACING_OPTIONS}
          value={verseSpacing}
        />
      </div>
      {showContinuityToggle && onWirdVisibleChange ? (
        <div className="qar-react-settings-row qar-react-settings-row--switch">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Reading continuity</span>
            <span className="qar-react-settings-row-control">Show Daily Wird progress in the reader</span>
          </span>
          <Switch checked={wirdVisible} label="Reading continuity" onCheckedChange={onWirdVisibleChange} />
        </div>
      ) : null}
    </div>
  )
}
