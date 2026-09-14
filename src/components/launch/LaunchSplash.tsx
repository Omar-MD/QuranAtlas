import { Spinner } from '../ui'

// Launch/splash (S11): ۞ motif placement 3, wordmark, labelled spinner —
// never a marketing hero, never longer than necessary.
export function LaunchSplash() {
  return (
    <div aria-label="Opening QuranAtlas" className="qar-launch-splash" role="status">
      <span aria-hidden="true" className="qar-ornament-rule-star">
        ۞
      </span>
      <p className="qar-launch-wordmark">QuranAtlas</p>
      <Spinner label="Opening QuranAtlas" />
    </div>
  )
}
