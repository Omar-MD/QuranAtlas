import { CircleSlash, MoonStar, Sun } from 'lucide-react'
import type { ComponentType } from 'react'

import { Button } from '../ui'
import type { ReactNightModePreference, ReactThemePreference } from '../../storage/settings-writer'

type AppearanceIconProps = {
  size?: number
  strokeWidth?: number
  'aria-hidden'?: boolean
}

type AppearanceOption<T extends string> = {
  id: T
  icon?: ComponentType<AppearanceIconProps>
  iconId: string
  label: string
  swatch?: 'sepia'
}

const THEMES: Array<AppearanceOption<ReactThemePreference>> = [
  { id: 'light', icon: Sun, iconId: 'theme-light', label: 'Light' },
  { id: 'sepia', iconId: 'theme-sepia', label: 'Sepia', swatch: 'sepia' },
  { id: 'dark', icon: MoonStar, iconId: 'theme-dark', label: 'Dark' },
  { id: 'auto', icon: CircleSlash, iconId: 'theme-auto', label: 'Auto' },
]

const NIGHT_MODES = [
  { id: 'off', icon: NightOffIcon, iconId: 'night-off', label: 'Off' },
  { id: 'on', icon: NightOnIcon, iconId: 'night-on', label: 'On' },
  { id: 'auto', icon: NightAutoIcon, iconId: 'night-auto', label: 'Auto' },
] satisfies Array<AppearanceOption<ReactNightModePreference>>

export function ThemeNightControls({
  nightMode,
  onNightModeChange,
  onThemeChange,
  theme,
}: {
  nightMode: ReactNightModePreference
  onNightModeChange: (value: ReactNightModePreference) => void
  onThemeChange: (value: ReactThemePreference) => void
  theme: ReactThemePreference
}) {
  return (
    <div className="qar-react-settings-theme-night" aria-label="Theme and night mode">
      <section className="qar-react-settings-footer-panel" aria-labelledby="qar-react-settings-theme">
        <h3 className="qar-react-settings-footer-title" id="qar-react-settings-theme">Theme</h3>
        <div className="qar-react-settings-theme-strip" role="group" aria-label="Theme">
          {THEMES.map((option) => (
            <AppearanceChoice
              active={theme === option.id}
              icon={option.icon}
              iconId={option.iconId}
              key={option.id}
              label={option.label}
              onClick={() => onThemeChange(option.id)}
              prefix="Theme"
              swatch={option.swatch}
            />
          ))}
        </div>
      </section>
      <section className="qar-react-settings-footer-panel" aria-labelledby="qar-react-settings-night">
        <h3 className="qar-react-settings-footer-title" id="qar-react-settings-night">Night mode</h3>
        <div className="qar-react-settings-night-strip" role="group" aria-label="Night mode">
          {NIGHT_MODES.map((option) => {
            const Icon = option.icon
            return (
              <AppearanceChoice
                active={nightMode === option.id}
                icon={Icon}
                iconId={option.iconId}
                key={option.id}
                label={option.label}
                onClick={() => onNightModeChange(option.id)}
                prefix="Night mode"
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

function AppearanceChoice({
  active,
  icon: Icon,
  iconId,
  label,
  onClick,
  prefix,
  swatch,
}: {
  active: boolean
  icon?: ComponentType<AppearanceIconProps>
  iconId: string
  label: string
  onClick: () => void
  prefix: string
  swatch?: string
}) {
  return (
    <Button
      aria-label={`${prefix}: ${label}`}
      aria-pressed={active}
      className="qar-react-settings-appearance-choice"
      onClick={onClick}
      size="sm"
      variant="ghost"
    >
      <span
        className="qar-react-settings-appearance-icon"
        data-appearance-icon={iconId}
        data-swatch={swatch}
        data-testid={swatch ? 'settings-theme-swatch' : undefined}
      >
        {Icon ? <Icon aria-hidden={true} size={19} strokeWidth={1.55} /> : null}
        {swatch ? <span className="qar-react-settings-theme-swatch" data-swatch={swatch} /> : null}
      </span>
      <span className="qar-react-settings-choice-label">{label}</span>
    </Button>
  )
}

function NightOffIcon({ size = 19, strokeWidth = 1.55, 'aria-hidden': ariaHidden = true }: AppearanceIconProps) {
  return (
    <svg
      aria-hidden={ariaHidden}
      data-night-icon="sun"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="3.55" />
      <path d="M12 2.9v2.05M12 19.05v2.05M4.24 4.24 5.7 5.7M18.3 18.3l1.46 1.46M2.9 12h2.05M19.05 12h2.05M4.24 19.76 5.7 18.3M18.3 5.7l1.46-1.46" />
    </svg>
  )
}

function NightOnIcon({ size = 19, 'aria-hidden': ariaHidden = true }: AppearanceIconProps) {
  return (
    <svg
      aria-hidden={ariaHidden}
      data-night-icon="crescent"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M15.38 3.88a8.2 8.2 0 1 0 4.74 13.35A8.92 8.92 0 0 1 9.8 6.86a8.82 8.82 0 0 1 5.58-2.98Z" />
    </svg>
  )
}

function NightAutoIcon({ size = 19, 'aria-hidden': ariaHidden = true }: AppearanceIconProps) {
  return (
    <svg
      aria-hidden={ariaHidden}
      data-night-icon="crescent-sparkles"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10.68 10.15a5.22 5.22 0 0 0 4.4 8.1 5.64 5.64 0 1 1-4.4-8.1Z" />
      <path d="M17.18 3.75 18 5.95l2.22.82L18 7.58l-.82 2.2-.82-2.2-2.22-.81 2.22-.82.82-2.2Z" />
      <path d="M6.58 5.82 7.1 7.2l1.38.52-1.38.5-.52 1.4-.5-1.4-1.4-.5 1.4-.52.5-1.38Z" />
    </svg>
  )
}
