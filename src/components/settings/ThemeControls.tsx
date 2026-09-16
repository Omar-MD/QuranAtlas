import { ChoiceButton, Switch } from '../ui'
import type { ReactThemePreference } from '../../storage/settings-writer'

const THEMES: Array<{ id: ReactThemePreference; label: string; swatch: 'light' | 'sepia' | 'dark' | 'system' }> = [
  { id: 'light', label: 'Light', swatch: 'light' },
  { id: 'sepia', label: 'Sepia', swatch: 'sepia' },
  { id: 'dark', label: 'Dark', swatch: 'dark' },
  { id: 'auto', label: 'System', swatch: 'system' },
]

// S8 Appearance: ONE theme selector (Light/Sepia/Dark/System — System follows
// the OS) plus the separately-named "Dim page images" switch, the only image
// treatment (repair A3: the Theme/Night pair and night-dimming radios are
// removed). Swatches share one layout; selected = quiet ink ring.
export function ThemeControls({
  dimPageImages,
  onDimPageImagesChange,
  onThemeChange,
  theme,
}: {
  dimPageImages: boolean
  onDimPageImagesChange: (value: boolean) => void
  onThemeChange: (value: ReactThemePreference) => void
  theme: ReactThemePreference
}) {
  return (
    <div className="qar-react-settings-panel-controls">
      <div className="qar-react-settings-row qar-react-settings-row--stack">
        <span className="qar-react-settings-row-label" id="qar-theme-group-label">
          Theme
        </span>
        <div aria-labelledby="qar-theme-group-label" className="qar-theme-strip" role="radiogroup">
          {THEMES.map((option) => {
            const active = theme === option.id
            return (
              <ChoiceButton
                aria-checked={active}
                aria-label={`Theme: ${option.label}`}
                className="qar-theme-choice"
                data-testid="settings-theme-choice"
                key={option.id}
                onClick={() => onThemeChange(option.id)}
                role="radio"
                tabIndex={active ? 0 : -1}
              >
                <span aria-hidden="true" className="qar-theme-swatch" data-swatch={option.swatch} />
                <span className="qar-theme-choice-label">{option.label}</span>
              </ChoiceButton>
            )
          })}
        </div>
      </div>
      <div className="qar-react-settings-row qar-react-settings-row--switch">
        <span className="qar-react-settings-row-copy">
          <span className="qar-react-settings-row-label">Dim page images</span>
          <span className="qar-react-settings-row-control">Dims Mushaf page images in Dark theme.</span>
        </span>
        <Switch checked={dimPageImages} hideLabel label="Dim page images" onCheckedChange={onDimPageImagesChange} />
      </div>
    </div>
  )
}
