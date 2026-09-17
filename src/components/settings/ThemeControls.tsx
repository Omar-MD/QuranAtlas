import { TileGroup } from '../ui'
import type { ReactThemePreference } from '../../storage/settings-writer'

type ThemeSample = 'light' | 'sepia' | 'dark' | 'system'

const THEMES: Array<{ value: ReactThemePreference; label: string; sample: ThemeSample }> = [
  { value: 'light', label: 'Light', sample: 'light' },
  { value: 'sepia', label: 'Sepia', sample: 'sepia' },
  { value: 'dark', label: 'Dark', sample: 'dark' },
  { value: 'auto', label: 'System', sample: 'system' },
]

// Theme tile (brief §4.3): a miniature page showing the theme's real canvas,
// ink, muted and accent as three short bars. Colours come from the static
// per-theme sample tokens, never the live theme.
function ThemeTile({ sample }: { sample: ThemeSample }) {
  if (sample === 'system') {
    return (
      <span aria-hidden="true" className="qar-react-theme-tile qar-react-theme-tile--system">
        <span className="qar-react-theme-tile-half" data-sample="light">
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--ink" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--muted" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--accent" />
        </span>
        <span className="qar-react-theme-tile-half" data-sample="dark">
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--ink" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--muted" />
          <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--accent" />
        </span>
      </span>
    )
  }
  return (
    <span aria-hidden="true" className="qar-react-theme-tile" data-sample={sample}>
      <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--ink" />
      <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--muted" />
      <span className="qar-react-theme-tile-bar qar-react-theme-tile-bar--accent" />
    </span>
  )
}

// Appearance group control (brief §4.3): the eyebrow carries the meaning and
// the tiles carry the samples — no extra row label.
export function ThemeControls({
  onThemeChange,
  theme,
}: {
  onThemeChange: (value: ReactThemePreference) => void
  theme: ReactThemePreference
}) {
  return (
    <TileGroup
      label="Theme"
      onValueChange={(value) => onThemeChange(value as ReactThemePreference)}
      options={THEMES.map(({ label, sample, value }) => ({ label, value, visual: <ThemeTile sample={sample} /> }))}
      value={theme}
    />
  )
}
