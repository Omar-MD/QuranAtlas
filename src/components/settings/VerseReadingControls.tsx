import { Stepper, Switch, TileGroup } from '../ui'
import type { ReactNode } from 'react'
import type { ReactPreferenceStep } from '../../storage/settings-writer'

import { SettingsRow } from './SettingsRow'

const ARABIC_STEPS: ReactPreferenceStep[] = ['xs', 'sm', 'md', 'lg', 'xl']
const TRANSLATION_STEPS: ReactPreferenceStep[] = ['xs', 'sm', 'md', 'lg', 'xl']

function stepLabel(value: ReactPreferenceStep, index: number, count: number): string {
  if (index <= 0) return 'Smallest'
  if (index >= count - 1) return 'Largest'
  return { xs: 'Smallest', sm: 'Small', md: 'Default', lg: 'Large', xl: 'Largest' }[value] ?? 'Default'
}

// Spacing tile glyph (brief §4.4): two verse blocks — a 2 px text line over a
// 1.5 px muted line — with the gap between blocks encoding the preset.
function SpacingGlyph({ gap }: { gap: number }) {
  const blockHeight = 5.5
  const top = (24 - (blockHeight * 2 + gap)) / 2
  return (
    <svg aria-hidden="true" fill="none" height={24} viewBox="0 0 28 24" width={28}>
      <rect fill="currentColor" height={2} rx={0.75} width={20} x={4} y={top} />
      <rect className="qar-react-spacing-glyph-muted" height={1.5} rx={0.75} width={14} x={4} y={top + 3.5} />
      <rect fill="currentColor" height={2} rx={0.75} width={20} x={4} y={top + blockHeight + gap} />
      <rect
        className="qar-react-spacing-glyph-muted"
        height={1.5}
        rx={0.75}
        width={14}
        x={4}
        y={top + blockHeight + gap + 3.5}
      />
    </svg>
  )
}

const SPACING_TILES: Array<{ gap: number; label: string; value: ReactPreferenceStep }> = [
  { gap: 3, label: 'Compact', value: 'xs' },
  { gap: 6, label: 'Comfortable', value: 'md' },
  { gap: 10, label: 'Spacious', value: 'xl' },
]

// S8 Reading section (verse view) — shared by the settings shell and the S3
// adjustments sheet. One label per control; the same controls render in both
// surfaces with the same labels and sizes (brief §4.14).
export function VerseReadingControls({
  fontSize,
  onFontSizeChange,
  onTranslationFontSizeChange,
  onVerseSpacingChange,
  onWirdVisibleChange,
  showContinuityToggle = false,
  translationFontSize,
  translationRow,
  translationVisible = true,
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
  /** The Translation Select row — Settings only; the Aa sheet passes nothing. */
  translationRow?: ReactNode
  translationVisible?: boolean
  verseSpacing: ReactPreferenceStep
  wirdVisible?: boolean
}) {
  const translationOff = !translationVisible
  return (
    <div className="qar-react-settings-panel-controls">
      <SettingsRow label="Arabic size">
        <Stepper
          glyph="arabic"
          label="Arabic size"
          onValueChange={(next) => onFontSizeChange(next as ReactPreferenceStep)}
          options={ARABIC_STEPS.map((step, index) => ({
            value: step,
            label: stepLabel(step, index, ARABIC_STEPS.length),
          }))}
          value={fontSize}
        />
      </SettingsRow>
      <SettingsRow helper={translationOff ? 'Translation is off' : undefined} label="Translation size">
        <div
          aria-disabled={translationOff || undefined}
          className={translationOff ? 'qar-react-settings-control-disabled' : undefined}
        >
          <Stepper
            glyph="latin"
            label="Translation size"
            onValueChange={(next) => onTranslationFontSizeChange(next as ReactPreferenceStep)}
            options={TRANSLATION_STEPS.map((step, index) => ({
              value: step,
              label: stepLabel(step, index, TRANSLATION_STEPS.length),
            }))}
            value={translationFontSize}
          />
        </div>
      </SettingsRow>
      <SettingsRow label="Verse spacing" layout="block">
        <TileGroup
          label="Verse spacing"
          onValueChange={(value) => onVerseSpacingChange(value as ReactPreferenceStep)}
          options={SPACING_TILES.map(({ gap, label, value }) => ({
            label,
            value,
            visual: <SpacingGlyph gap={gap} />,
          }))}
          value={verseSpacing}
        />
      </SettingsRow>
      {translationRow}
      {showContinuityToggle && onWirdVisibleChange ? (
        <SettingsRow helper="Show Daily Wird progress in the reader" label="Reading continuity">
          <Switch checked={wirdVisible} hideLabel label="Reading continuity" onCheckedChange={onWirdVisibleChange} />
        </SettingsRow>
      ) : null}
    </div>
  )
}
