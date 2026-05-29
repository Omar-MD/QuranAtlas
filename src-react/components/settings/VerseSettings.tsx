import { Select, Slider, Switch } from '../ui'
import type { ReactPreferenceStep } from '../../storage/settings-writer'

const STEP_VALUES: ReactPreferenceStep[] = ['xs', 'sm', 'md', 'lg', 'xl']

const FLOW_STEPS: Array<{ label: string; value: ReactPreferenceStep }> = [
  { label: 'Compact', value: 'xs' },
  { label: 'Tight', value: 'sm' },
  { label: 'Standard', value: 'md' },
  { label: 'Spacious', value: 'lg' },
  { label: 'Wide', value: 'xl' },
]

export function VerseSettings({
  fontSize,
  onFontSizeChange,
  onReadingFlowChange,
  onTranslationVisibleChange,
  readingFlow,
  translationVisible,
}: {
  fontSize: ReactPreferenceStep
  onFontSizeChange: (value: ReactPreferenceStep) => void
  onReadingFlowChange: (value: ReactPreferenceStep) => void
  onTranslationVisibleChange: (value: boolean) => void
  readingFlow: ReactPreferenceStep
  translationVisible: boolean
}) {
  return (
    <section className="qar-react-settings-panel qar-react-settings-panel--verse" aria-label="Verse settings" aria-labelledby="qar-react-settings-reading">
      <div className="qar-react-settings-panel-head">
        <h3 className="qar-react-settings-section-title" id="qar-react-settings-reading">Verse</h3>
        <span className="qar-react-settings-row-control">Text and meaning</span>
      </div>
      <div className="qar-react-settings-panel-controls">
        <FontSizeControl label="Font size" onChange={onFontSizeChange} value={fontSize} />
        <ReadingFlowControl label="Reading flow" onChange={onReadingFlowChange} value={readingFlow} />
        <div className="qar-react-settings-row qar-react-settings-row--switch">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Bridges Translation</span>
            <span className="qar-react-settings-row-control">Show meaning below each verse</span>
          </span>
          <Switch
            checked={translationVisible}
            className="qar-react-settings-switch"
            label="Show translation"
            onCheckedChange={onTranslationVisibleChange}
          />
        </div>
      </div>
    </section>
  )
}

function FontSizeControl({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: ReactPreferenceStep) => void
  value: ReactPreferenceStep
}) {
  const index = Math.max(0, STEP_VALUES.indexOf(value))

  return (
    <div className="qar-react-settings-row qar-react-settings-row--font-size">
      <span className="qar-react-settings-row-copy">
        <span className="qar-react-settings-row-label">{label}</span>
        <span className="qar-react-settings-row-control">{labelStep(value)}</span>
      </span>
      <div className="qar-react-settings-font-slider">
        <span className="qar-react-settings-font-size-mark qar-react-settings-font-size-mark--small" aria-hidden="true">A</span>
        <Slider
          className="qar-react-settings-font-size-slider"
          hideLabel
          label={label}
          max={STEP_VALUES.length - 1}
          min={0}
          onValueChange={([nextValue]) => onChange(STEP_VALUES[nextValue ?? 2] ?? 'md')}
          step={1}
          value={[index]}
        />
        <span className="qar-react-settings-font-size-mark qar-react-settings-font-size-mark--large" aria-hidden="true">A</span>
      </div>
    </div>
  )
}

function ReadingFlowControl({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: ReactPreferenceStep) => void
  value: ReactPreferenceStep
}) {
  return (
    <div className="qar-react-settings-row qar-react-settings-row--select">
      <span className="qar-react-settings-row-label">{label}</span>
      <Select
        className="qar-react-settings-reading-flow-select"
        label={label}
        onValueChange={(nextValue) => onChange(nextValue as ReactPreferenceStep)}
        options={FLOW_STEPS}
        value={value}
      />
    </div>
  )
}

function labelStep(value: ReactPreferenceStep): string {
  return {
    xs: 'Extra small',
    sm: 'Small',
    md: 'Medium',
    lg: 'Large',
    xl: 'Extra large',
  }[value]
}
