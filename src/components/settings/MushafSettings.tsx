import { Check } from 'lucide-react'
import type { MushafResolvedPage } from '../../packs/mushaf-page-asset'
import { mushafImagePlacement } from '../reader/mushaf-page-framing'
import { Button, ChoiceButton, SegmentedControl, Slider } from '../ui'
import type { MushafNavigationMode, MushafViewMode } from '../reader/MushafModeControl'
import { NotationGuideButton } from './NotationGuide'
import { SettingsGroup } from './SettingsGroup'

// S4/S8 Mushaf viewer controls: View (Full page / Reading fit, each with a
// live thumbnail of the current page), Page mode (Single / Scroll), Page zoom
// slider with percentage readout (repair B6 — never labelled "text size"),
// and the text-first Notation guide.
export function MushafSettings({
  framing = 0,
  framingWriteStatus,
  hasValidFraming = false,
  mode,
  onFramingChange,
  onModeChange,
  onRetryFraming,
  pageImageUrl,
  page,
}: {
  framing?: number
  framingWriteStatus: 'idle' | 'saving' | 'error'
  hasValidFraming?: boolean
  mode: MushafViewMode
  onFramingChange?: (value: number) => void
  onModeChange: (mode: MushafNavigationMode) => void
  onRetryFraming: () => void
  page?: MushafResolvedPage | null
  pageImageUrl?: string | null
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
            <div className="qar:grid qar:grid-flow-col qar:justify-start qar:gap-2">
              <FitOption
                label="Full page"
                onClick={() => setView('full')}
                selected={view === 'full'}
                url={pageImageUrl}
                page={page}
              />
              <FitOption
                label="Reading fit"
                onClick={() => setView('reading')}
                selected={view === 'reading'}
                url={pageImageUrl}
                page={page}
              />
            </div>
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
        <div className="qar-react-settings-row">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Notation guide</span>
            <span className="qar-react-settings-row-control">What the marks on the page mean</span>
          </span>
          <NotationGuideButton />
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

function FitOption({
  label,
  onClick,
  selected,
  url,
  page,
}: {
  label: string
  onClick: () => void
  selected: boolean
  page?: MushafResolvedPage | null
  url?: string | null
}) {
  const placement = mushafImagePlacement(page?.displaySize, page?.framing?.textFrame, label === 'Reading fit' ? 1 : 0)
  return (
    <ChoiceButton
      aria-pressed={selected}
      className="qar-theme-choice"
      data-testid={`mushaf-fit-${label === 'Full page' ? 'full' : 'reading'}`}
      onClick={onClick}
    >
      <span aria-hidden="true" className="qar-fit-thumbnail" style={{ aspectRatio: placement.ratio }}>
        {url ? <img alt="" src={url} style={placement.image} /> : null}
      </span>
      <span className="qar-theme-choice-label">
        {selected ? <Check aria-hidden="true" size={14} /> : null}
        {label}
      </span>
    </ChoiceButton>
  )
}
