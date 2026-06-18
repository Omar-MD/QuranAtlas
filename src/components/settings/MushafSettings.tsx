import { MushafModeControl, type MushafViewMode } from '../reader/MushafModeControl'
import { Switch } from '../ui'

export function MushafSettings({
  fitWidth,
  mode,
  onFitWidthChange,
  onModeChange,
}: {
  fitWidth: boolean
  mode: MushafViewMode
  onFitWidthChange: (fitWidth: boolean) => void
  onModeChange: (mode: MushafViewMode) => void
}) {
  return (
    <section className="qar-react-settings-panel qar-react-settings-panel--mushaf" aria-label="Mushaf settings" aria-labelledby="qar-react-settings-mushaf">
      <div className="qar-react-settings-panel-head">
        <h3 className="qar-react-settings-section-title" id="qar-react-settings-mushaf">Mushaf</h3>
        <span className="qar-react-settings-row-control">Navigation</span>
      </div>
      <div className="qar-react-settings-panel-controls">
        <div className="qar-react-settings-row qar-react-settings-row--control">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Navigation mode</span>
            <span className="qar-react-settings-row-control">Single page or continuous scroll</span>
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
      </div>
    </section>
  )
}
