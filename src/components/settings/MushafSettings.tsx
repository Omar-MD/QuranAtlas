import { Button, SegmentedControl, Slider } from '../ui'
import type { MushafNavigationMode, MushafViewMode } from '../reader/MushafModeControl'
import { SettingsGroup } from './SettingsGroup'

// S4/S8 Mushaf viewer controls: View (Full page / Reading fit), Page mode
// (Single / Scroll), Page zoom slider with percentage readout (repair B6 —
// never labelled "text size"). The notation guide lives on the About screen.
export function MushafSettings({
  framing = 0,
  framingWriteStatus,
  hasValidFraming = false,
  mode,
  onFramingChange,
  onModeChange,
  onRetryFraming,
}: {
  framing?: number
  framingWriteStatus: 'idle' | 'saving' | 'error'
  hasValidFraming?: boolean
  mode: MushafViewMode
  onFramingChange?: (value: number) => void
  onModeChange: (mode: MushafNavigationMode) => void
  onRetryFraming: () => void
}) {
  const zoomPercent = Math.round(framing * 100)
  const view = framing > 0 ? 'reading' : 'full'

  function setView(next: string) {
    onFramingChange?.(next === 'reading' ? 1 : 0)
  }

  return (
    <SettingsGroup title="Mushaf page">
      <div className="qar-react-settings-panel-controls">
        {hasValidFraming ? (
          <div className="qar-react-settings-row qar-react-settings-row--stack">
            <span className="qar-react-settings-row-copy">
              <span className="qar-react-settings-row-label">View</span>
              <span className="qar-react-settings-row-control">Reading fit trims blank margins only</span>
            </span>
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
          </div>
        ) : null}
        <div className="qar-react-settings-row">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Page mode</span>
            <span className="qar-react-settings-row-control">Single page or vertical page scroll</span>
          </span>
          <SegmentedControl
            label="Page mode"
            onValueChange={(value) => onModeChange(value as MushafNavigationMode)}
            options={[
              { label: 'Single', value: 'fit-page' },
              { label: 'Scroll', value: 'continuous' },
            ]}
            value={mode === 'continuous' ? 'continuous' : 'fit-page'}
          />
        </div>
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
    </SettingsGroup>
  )
}
