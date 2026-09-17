import { Button, SegmentedControl, Slider, Switch } from '../ui'
import type { MushafNavigationMode, MushafViewMode } from '../reader/MushafModeControl'

import { SettingsRow } from './SettingsRow'

// Mushaf-mode Reading group (brief §16 G-3): the same row grammar as Verse
// settings — inline rows with content-sized right-aligned controls. Values and
// semantics of the Mushaf controls are unchanged.
export function MushafSettings({
  dimPageImages,
  framing = 0,
  framingWriteStatus,
  hasValidFraming = false,
  mode,
  onDimPageImagesChange,
  onFramingChange,
  onModeChange,
  onRetryFraming,
  onWirdVisibleChange,
  resolvedTheme = 'light',
  wirdVisible,
}: {
  dimPageImages?: boolean
  framing?: number
  framingWriteStatus: 'idle' | 'saving' | 'error'
  hasValidFraming?: boolean
  mode: MushafViewMode
  onDimPageImagesChange?: (value: boolean) => void
  onFramingChange?: (value: number) => void
  onModeChange: (mode: MushafNavigationMode) => void
  onRetryFraming: () => void
  onWirdVisibleChange?: (value: boolean) => void
  resolvedTheme?: 'light' | 'sepia' | 'dark'
  wirdVisible?: boolean
}) {
  const zoomPercent = Math.round(framing * 100)
  const view = framing > 0 ? 'reading' : 'full'
  const dimmingAvailable = resolvedTheme === 'dark'

  function setView(next: string) {
    onFramingChange?.(next === 'reading' ? 1 : 0)
  }

  return (
    <div className="qar-react-settings-panel-controls">
      <SettingsRow helper="Single page or vertical page scroll" label="Page mode">
        <SegmentedControl
          label="Page mode"
          onValueChange={(value) => onModeChange(value as MushafNavigationMode)}
          options={[
            { label: 'Single', value: 'fit-page' },
            { label: 'Scroll', value: 'continuous' },
          ]}
          value={mode === 'continuous' ? 'continuous' : 'fit-page'}
        />
      </SettingsRow>
      {hasValidFraming ? (
        <SettingsRow helper="Reading fit trims blank margins only" label="View" layout="block">
          <SegmentedControl
            label="View"
            onValueChange={setView}
            options={[
              { label: 'Full page', value: 'full' },
              { label: 'Reading fit', value: 'reading' },
            ]}
            value={view}
          />
          <div className="qar-react-mushaf-framing-controls">
            <Slider
              label="Page zoom"
              max={100}
              min={0}
              onValueChange={(values) => onFramingChange?.((values[0] ?? 0) / 100)}
              step={1}
              value={[zoomPercent]}
            />
            <p aria-live="polite" className="qar:m-0 qar:text-sm qar:text-muted" role="status">
              Page zoom — {zoomPercent}%
            </p>
          </div>
        </SettingsRow>
      ) : null}
      <SettingsRow helper="Applies in Dark theme" label="Dim page images">
        <Switch
          checked={dimPageImages}
          disabled={!dimmingAvailable}
          hideLabel
          label="Dim page images"
          onCheckedChange={onDimPageImagesChange}
        />
      </SettingsRow>
      {onWirdVisibleChange ? (
        <SettingsRow helper="Show Daily Wird progress in the reader" label="Reading continuity">
          <Switch checked={wirdVisible} hideLabel label="Reading continuity" onCheckedChange={onWirdVisibleChange} />
        </SettingsRow>
      ) : null}
      {framingWriteStatus === 'error' ? (
        <div className="qar:grid qar:gap-2">
          <p aria-live="polite" className="qar:m-0 qar:text-sm qar:leading-6 qar:text-danger" role="status">
            Could not save the page zoom
          </p>
          <Button onClick={onRetryFraming} size="sm" type="button" variant="secondary">
            Retry saving page zoom
          </Button>
        </div>
      ) : null}
    </div>
  )
}
