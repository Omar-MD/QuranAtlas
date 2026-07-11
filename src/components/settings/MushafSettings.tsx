import { MushafModeControl, type MushafNavigationMode, type MushafViewMode } from '../reader/MushafModeControl'
import { Switch } from '../ui'
import { SettingsGroup } from './SettingsGroup'

export function MushafSettings({
  fitWidth,
  mode,
  onFitWidthChange,
  onModeChange,
}: {
  fitWidth: boolean
  mode: MushafViewMode
  onFitWidthChange: (fitWidth: boolean) => void
  onModeChange: (mode: MushafNavigationMode) => void
}) {
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
      </div>
    </SettingsGroup>
  )
}
