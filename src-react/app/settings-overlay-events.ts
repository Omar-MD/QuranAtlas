import type { SettingsRouteMode } from './routes/settings/SettingsRoute'

export const REACT_OPEN_SETTINGS_EVENT = 'quranatlas-react-open-settings'

export type ReactOpenSettingsEvent = CustomEvent<{ mode?: SettingsRouteMode }>

export function requestReactSettingsOverlay(mode: SettingsRouteMode): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REACT_OPEN_SETTINGS_EVENT, { detail: { mode } }))
}

export function subscribeReactSettingsOverlayRequests(
  listener: (mode?: SettingsRouteMode) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined
  function onOpenSettings(event: Event): void {
    listener((event as ReactOpenSettingsEvent).detail?.mode)
  }
  window.addEventListener(REACT_OPEN_SETTINGS_EVENT, onOpenSettings)
  return () => window.removeEventListener(REACT_OPEN_SETTINGS_EVENT, onOpenSettings)
}
