import { Suspense, lazy, useEffect, useMemo, useState } from 'react'

import { SettingsRoute, type SettingsRouteMode } from './routes/settings/SettingsRoute'
import { LaunchSplash } from '../components/launch/LaunchSplash'
import { getInitialReactHash, matchReactRoute, REACT_ROUTES } from './router/routes'
import { subscribeReactSettingsOverlayRequests } from './settings-overlay-events'
import { shouldPersistLastSurface, useLaunchRestore } from '../continuity/launch-restore'
import { normalizeLastSurface } from '../continuity/last-surface'
import { applyReactReaderAppearance, subscribeReactReaderPreferencesChanged } from '../storage/reader-preferences'
import { readNativeReactReaderPreferences } from '../storage/settings-writer'
import { useFirstLaunchNotificationPermission } from '../continuity/wird/use-first-launch-notification-permission'
import { useWirdReminderScheduler } from '../continuity/wird/use-wird-reminder-scheduler'
import { readNativeSetting, writeNativeSetting } from '../storage/native-reader-store'

const AboutRoute = lazy(() => import('./routes/settings/AboutRoute').then((module) => ({ default: module.AboutRoute })))
const BookmarksRoute = lazy(() => import('./routes/navigation/BookmarksRoute').then((module) => ({ default: module.BookmarksRoute })))
const MushafRoute = lazy(() => import('./routes/read/MushafRoute').then((module) => ({ default: module.MushafRoute })))
const OnboardingRoute = lazy(() => import('./routes/onboarding/OnboardingRoute').then((module) => ({ default: module.OnboardingRoute })))
const ReaderRoute = lazy(() => import('./routes/read/ReaderRoute').then((module) => ({ default: module.ReaderRoute })))
const SearchRoute = lazy(() => import('./routes/search/SearchRoute').then((module) => ({ default: module.SearchRoute })))
const SurahsRoute = lazy(() => import('./routes/navigation/SurahsRoute').then((module) => ({ default: module.SurahsRoute })))

export function App() {
  useWirdReminderScheduler()
  const initialRoute = useMemo(() => getInitialReactHash(), [])
  const [hash, setHash] = useState(initialRoute)
  const [lastReaderHash, setLastReaderHash] = useState<string | null>(null)
  const [settingsOverlay, setSettingsOverlay] = useState<{
    initialAssetsExpanded?: boolean
    mode: SettingsRouteMode
    previousHash: string
    returnFocusId?: string
  } | null>(null)
  const launchRestore = useLaunchRestore(hash)
  const activeHash = launchRestore.status === 'ready' ? launchRestore.hash : hash
  const activeRoute = matchReactRoute(activeHash)
  useFirstLaunchNotificationPermission(launchRestore.status === 'ready')
  const transientSettingsHash = !settingsOverlay
    && activeRoute.type === 'settings'
    && lastReaderHash
    && shouldPersistLastSurface(lastReaderHash)
      ? lastReaderHash
      : null
  const route = settingsOverlay
    ? matchReactRoute(settingsOverlay.previousHash)
    : transientSettingsHash
      ? matchReactRoute(transientSettingsHash)
      : activeRoute
  const showHeader = launchRestore.status !== 'ready' || !['about', 'onboarding', 'reader', 'mushaf', 'search'].includes(route.type)

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', initialRoute)
    }
    function syncHash(event: HashChangeEvent) {
      const nextHash = getInitialReactHash()
      if (matchReactRoute(nextHash).type === 'settings') {
        const previousHash = event.oldURL ? new URL(event.oldURL, window.location.href).hash : hash
        if (shouldPersistLastSurface(previousHash)) setLastReaderHash(previousHash)
      }
      setHash(nextHash)
    }
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [hash, initialRoute])

  useEffect(() => {
    let active = true
    void readNativeReactReaderPreferences()
      .then((preferences) => {
        if (active) applyReactReaderAppearance(preferences)
      })
      .catch(() => undefined)
    const unsubscribe = subscribeReactReaderPreferencesChanged((preferences) => {
      if (preferences.theme && preferences.nightMode) {
        applyReactReaderAppearance({ theme: preferences.theme, nightMode: preferences.nightMode })
      }
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => subscribeReactSettingsOverlayRequests((request) => {
    const previousHash = window.location.hash
    if (!shouldPersistLastSurface(previousHash)) return
    setLastReaderHash(previousHash)
    setSettingsOverlay({
      mode: settingsModeForHash(previousHash),
      previousHash,
      returnFocusId: request.returnFocusId,
    })
  }), [])

  useEffect(() => {
    if (settingsOverlay) return
    if (launchRestore.status !== 'ready' || launchRestore.sourceHash !== hash || launchRestore.hash === hash) return
    window.history.replaceState(null, '', launchRestore.hash)
  }, [hash, launchRestore.hash, launchRestore.sourceHash, launchRestore.status, settingsOverlay])

  useEffect(() => {
    if (launchRestore.status !== 'ready' || !shouldPersistLastSurface(activeHash)) return
    setLastReaderHash(activeHash)
    let active = true
    void writeNormalizedLastSurface(activeHash, () => active).then(() => {
      if (!active) return undefined
      return undefined
    })
    return () => {
      active = false
    }
  }, [activeHash, launchRestore.status])

  useEffect(() => {
    if (launchRestore.status !== 'ready' || activeRoute.type !== 'settings') return
    let active = true

    async function openSettingsOverlay() {
      const initialAssetsExpanded = activeHash.split('?')[0] === REACT_ROUTES.assets
      const previousHash = await resolveSettingsPreviousHash(lastReaderHash)
      if (!active) return
      setSettingsOverlay({
        initialAssetsExpanded,
        mode: settingsModeForHash(previousHash),
        previousHash,
      })
      window.history.replaceState(null, '', previousHash)
      setHash(previousHash)
    }

    void openSettingsOverlay()
    return () => {
      active = false
    }
  }, [activeHash, activeRoute.type, lastReaderHash, launchRestore.status])

  function closeSettingsOverlay() {
    const previousHash = settingsOverlay?.previousHash
    setSettingsOverlay(null)
    if (previousHash && window.location.hash !== previousHash) {
      window.history.replaceState(null, '', previousHash)
      setHash(previousHash)
    }
  }

  function replaceActiveHash(nextHash: string): void {
    window.history.replaceState(null, '', nextHash)
    setHash(nextHash)
  }

  return (
    <div className="qar:min-h-screen qar:bg-canvas qar:text-text" data-react-route={activeHash}>
      <div aria-hidden="true" className="qar-react-night-shift" data-testid="react-night-shift" />
      {showHeader && (
        <header className="qar:border-b qar:border-border qar:bg-surface qar:px-5 qar:py-3">
          <h1 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">QuranAtlas</h1>
        </header>
      )}
      {launchRestore.status === 'loading' && (
        <LaunchSplash />
      )}
      {launchRestore.status === 'ready' && (
        <Suspense fallback={<LaunchSplash />}>
          {route.type === 'reader' && <ReaderRoute ayah={route.ayah} preservePosition={Boolean(settingsOverlay)} surah={route.surah} />}
          {route.type === 'mushaf' && (
            <MushafRoute
              interactionSuspended={Boolean(settingsOverlay)}
              onReplaceHash={replaceActiveHash}
              page={route.page}
            />
          )}
          {route.type === 'surahs' && <SurahsRoute />}
          {route.type === 'bookmarks' && <BookmarksRoute />}
          {route.type === 'search' && <SearchRoute />}
          {route.type === 'about' && <AboutRoute />}
          {route.type === 'unsupported' && <UnsupportedRoute />}
          {route.type === 'onboarding' && (
            <OnboardingRoute onComplete={(nextHash) => {
              window.history.replaceState(null, '', nextHash)
              setHash(nextHash)
            }} />
          )}
          {settingsOverlay && (
            <SettingsRoute
              initialAssetsExpanded={settingsOverlay.initialAssetsExpanded}
              mode={settingsOverlay.mode}
              onClose={closeSettingsOverlay}
              previousHash={settingsOverlay.previousHash}
              returnFocusId={settingsOverlay.returnFocusId}
            />
          )}
        </Suspense>
      )}
    </div>
  )
}

async function resolveSettingsPreviousHash(lastReaderHash: string | null): Promise<string> {
  if (lastReaderHash && shouldPersistLastSurface(lastReaderHash)) return lastReaderHash
  try {
    const record = await readNativeSetting('lastSurface')
    if (typeof record?.value === 'string' && shouldPersistLastSurface(record.value)) return record.value
  } catch {
    // Fall through to the default reader route.
  }
  return '#/s/1'
}

async function writeNormalizedLastSurface(hash: string, shouldWrite: () => boolean): Promise<void> {
  const normalized = normalizeLastSurface(hash)
  if (!normalized) return
  await writeNativeSetting({ key: 'lastSurface', value: normalized }, shouldWrite)
}

function settingsModeForHash(hash: string): SettingsRouteMode {
  return matchReactRoute(hash).type === 'mushaf' ? 'mushaf' : 'verse'
}

function UnsupportedRoute() {
  return (
    <main className="qar:grid qar:mx-auto qar:w-full qar:max-w-2xl qar:gap-3 qar:px-5 qar:py-8" aria-label="Unsupported route">
      <p className="qar:m-0 qar:text-xs qar:font-medium qar:uppercase qar:tracking-wide qar:text-muted">Unavailable</p>
      <h2 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">Route unavailable</h2>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        This route is not part of the current QuranAtlas MVP.
      </p>
    </main>
  )
}
