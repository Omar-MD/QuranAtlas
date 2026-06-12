import { MushafModeControl } from '../reader/MushafModeControl'
import type { ReactMushafViewMode } from '../../storage/settings-writer'

export function MushafSettings({
  mode,
  onModeChange,
}: {
  mode: ReactMushafViewMode
  onModeChange: (mode: ReactMushafViewMode) => void
}) {
  return (
    <section className="qar-react-settings-panel qar-react-settings-panel--mushaf" aria-label="Mushaf settings" aria-labelledby="qar-react-settings-mushaf">
      <div className="qar-react-settings-panel-head">
        <h3 className="qar-react-settings-section-title" id="qar-react-settings-mushaf">Mushaf</h3>
        <span className="qar-react-settings-row-control">Page view</span>
      </div>
      <div className="qar-react-settings-panel-controls">
        <div className="qar-react-settings-row qar-react-settings-row--control">
          <span className="qar-react-settings-row-copy">
            <span className="qar-react-settings-row-label">Mushaf view mode</span>
            <span className="qar-react-settings-row-control">Fit or scroll adjacent pages</span>
          </span>
          <MushafModeControl mode={mode} onModeChange={onModeChange} />
        </div>
      </div>
    </section>
  )
}
