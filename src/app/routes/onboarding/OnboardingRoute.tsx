import { useEffect } from 'react'

import { LaunchSplash } from '../../../components/launch/LaunchSplash'

export function OnboardingRoute({ onComplete }: { onComplete?: (hash: string) => void } = {}) {
  useEffect(() => {
    onComplete?.('#/s/1')
    if (!onComplete) window.location.hash = '#/s/1'
  }, [onComplete])

  return <LaunchSplash />
}
