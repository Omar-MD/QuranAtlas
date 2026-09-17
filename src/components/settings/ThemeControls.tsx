import { SegmentedControl } from '../ui'
import type { ReactThemePreference } from '../../storage/settings-writer'

const THEMES: Array<{ value: ReactThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'System' },
]

export function ThemeControls({
  onThemeChange,
  theme,
}: {
  onThemeChange: (value: ReactThemePreference) => void
  theme: ReactThemePreference
}) {
  return (
    <div className="qar-react-settings-panel-controls">
      <div className="qar-react-settings-row">
        <span className="qar-react-settings-row-label">Theme</span>
        <SegmentedControl
          label="Theme"
          onValueChange={(value) => onThemeChange(value as ReactThemePreference)}
          options={THEMES}
          value={theme}
        />
      </div>
    </div>
  )
}
