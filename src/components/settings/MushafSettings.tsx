import { MushafModeControl, type MushafNavigationMode, type MushafViewMode } from '../reader/MushafModeControl'
import { Button, Slider, Switch } from '../ui'
import { interpolateMushafPageFrame, type NormalizedRect } from '../reader/mushaf-page-framing'
import { SettingsGroup } from './SettingsGroup'
import type { MushafFramingWriteStatus } from './useSettingsForm'

export function MushafSettings({
  fitWidth,
  framing = 0,
  framingWriteStatus,
  hasValidFraming = false,
  representativeTextFrame,
  mode,
  onFitWidthChange,
  onFramingChange,
  onModeChange,
  onRetryFraming,
}: {
  fitWidth: boolean
  framing?: number
  framingWriteStatus: MushafFramingWriteStatus
  hasValidFraming?: boolean
  representativeTextFrame?: NormalizedRect
  mode: MushafViewMode
  onFitWidthChange: (fitWidth: boolean) => void
  onFramingChange?: (value: number) => void
  onModeChange: (mode: MushafNavigationMode) => void
  onRetryFraming: () => void
}) {
  const frameWidth = representativeTextFrame
    ? Math.round(interpolateMushafPageFrame(representativeTextFrame, framing).width * 100)
    : 100
  return (
    <SettingsGroup title="Page layout">
      <div className="qar-react-settings-panel-controls">
        <div className="qar-react-settings-row qar-react-settings-row--control">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Navigation mode</span>
            <span className="qar-react-settings-row-control">Single page or vertical page scroll</span>
          </span>
          <MushafModeControl mode={mode} onModeChange={onModeChange} />
        </div>
        <div className="qar-react-settings-row qar-react-settings-row--switch">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Fit width</span>
            <span className="qar-react-settings-row-control">Fill available screen width</span>
          </span>
          <Switch
            checked={fitWidth}
            className="qar-react-settings-switch"
            label="Fit width"
            onCheckedChange={(checked) => onFitWidthChange?.(checked)}
          />
        </div>
        {hasValidFraming ? (
          <div className="qar-react-settings-row qar-react-settings-row--control">
            <span className="qar-react-settings-row-copy">
              <span className="qar-react-settings-row-label">Qur'an text size</span>
              <span className="qar-react-settings-row-control">{frameWidth}% reviewed frame width</span>
            </span>
            <div className="qar-react-mushaf-framing-controls">
              <div className="qar-react-mushaf-framing-presets">
                <Button aria-pressed={framing === 0} onClick={() => onFramingChange?.(0)} size="sm" type="button" variant="secondary">Full page</Button>
                <Button aria-pressed={framing === 1} onClick={() => onFramingChange?.(1)} size="sm" type="button" variant="secondary">Text focus</Button>
              </div>
              <Slider label="Qur'an text size" max={100} min={0} onValueChange={(values) => onFramingChange?.((values[0] ?? 0) / 100)} step={1} value={[Math.round(framing * 100)]} />
            </div>
            {framingWriteStatus === 'error' ? (
              <div className="qar:grid qar:gap-2">
                <p aria-live="polite" className="qar:m-0 qar:text-sm qar:leading-6 qar:text-danger" role="status">Could not save Mushaf page framing</p>
                <Button onClick={onRetryFraming} size="sm" type="button" variant="secondary">Retry saving Mushaf framing</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </SettingsGroup>
  )
}
