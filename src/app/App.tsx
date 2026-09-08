import { Suspense, lazy, useEffect, useMemo, useState } from 'react'

import type { SettingsRouteMode } from './routes/settings/SettingsRoute'
import { Button, Status } from '../components/ui'
import { NavigationPageRecipe } from '../design-system/recipes/navigation-page'
import { LaunchSplash } from '../components/launch/LaunchSplash'
import { getInitialReactHash, matchReactRoute, REACT_ROUTES } from './router/routes'
import { subscribeReactSettingsOverlayRequests } from './settings-overlay-events'
import { shouldPersistLastSurface, useLaunchRestore } from '../continuity/launch-restore'
import { normalizeLastSurface } from '../continuity/last-surface'
import { applyReactReaderAppearance, subscribeReactReaderPreferencesChanged } from '../storage/reader-preferences'
import { readNativeReactReaderPreferences } from '../storage/settings-writer'
import { useFirstLaunchNotificationPermission } from '../continuity/wird/use-first-launch-notification-permission'
import { useWirdReminderScheduler } from '../continuity/wird/use-wird-reminder-scheduler'
import { BookmarksProvider } from '../continuity/bookmarks/use-bookmarks'
import { readNativeSetting, writeNativeSetting } from '../storage/native-reader-store'

const AboutRoute = lazy(() => import('./routes/settings/AboutRoute').then((module) => ({ default: module.AboutRoute })))
const NavigationRouteHost = lazy(() =>
  import('./routes/navigation/NavigationRouteHost').then((module) => ({ default: module.NavigationRouteHost })),
)
const BookmarksRoute = lazy(() =>
  import('./routes/navigation/BookmarksRoute').then((module) => ({ default: module.BookmarksRoute })),
)
const MushafRoute = lazy(() => import('./routes/read/MushafRoute').then((module) => ({ default: module.MushafRoute })))
const OnboardingRoute = lazy(() =>
  import('./routes/onboarding/OnboardingRoute').then((module) => ({ default: module.OnboardingRoute })),
)
const ReaderRoute = lazy(() => import('./routes/read/ReaderRoute').then((module) => ({ default: module.ReaderRoute })))
const SearchRoute = lazy(() =>
  import('./routes/search/SearchRoute').then((module) => ({ default: module.SearchRoute })),
)
const SettingsRoute = lazy(() =>
  import('./routes/settings/SettingsRoute').then((module) => ({ default: module.SettingsRoute })),
)
const SurahsRoute = lazy(() =>
  import('./routes/navigation/SurahsRoute').then((module) => ({ default: module.SurahsRoute })),
)

export function App() {
  useWirdReminderScheduler()
  const initialRoute = useMemo(() => getInitialReactHash(), [])
  const [hash, setHash] = useState(initialRoute)
  const [launchRefreshVersion, setLaunchRefreshVersion] = useState(0)
  const [lastBaseHash, setLastBaseHash] = useState<string | null>(null)
  const [settingsOverlay, setSettingsOverlay] = useState<{
    initialAssetsExpanded?: boolean
    mode: SettingsRouteMode
    previousHash: string
    returnFocusId?: string
  } | null>(null)
  const launchRestore = useLaunchRestore(hash, launchRefreshVersion)
  const activeHash =
    launchRestore.status === 'ready' ? launchRestore.hash : launchRestore.status === 'setup' ? '#/onboarding' : hash
  const activeRoute = matchReactRoute(activeHash)
  useFirstLaunchNotificationPermission(launchRestore.status === 'ready')
  const transientSettingsHash =
    !settingsOverlay && activeRoute.type === 'settings' && lastBaseHash && isBaseHash(lastBaseHash)
      ? lastBaseHash
      : null
  const route = settingsOverlay
    ? matchReactRoute(settingsOverlay.previousHash)
    : transientSettingsHash
      ? matchReactRoute(transientSettingsHash)
      : activeRoute
  const containsMushafViewport = route.type === 'mushaf'

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', initialRoute)
    }
    function syncHash(event: HashChangeEvent) {
      const nextHash = getInitialReactHash()
      if (matchReactRoute(nextHash).type === 'settings') {
        const previousHash = event.oldURL ? new URL(event.oldURL, window.location.href).hash : hash
        if (isBaseHash(previousHash)) setLastBaseHash(previousHash)
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

  useEffect(
    () =>
      subscribeReactSettingsOverlayRequests((request) => {
        const previousHash = window.location.hash
        if (!isReaderHash(previousHash)) return
        setLastBaseHash(previousHash)
        setSettingsOverlay({
          mode: settingsModeForHash(previousHash),
          previousHash,
          returnFocusId: request.returnFocusId,
        })
      }),
    [],
  )

  useEffect(() => {
    if (settingsOverlay) return
    if (launchRestore.status !== 'ready' || launchRestore.sourceHash !== hash || launchRestore.hash === hash) return
    window.history.replaceState(null, '', launchRestore.hash)
  }, [hash, launchRestore.hash, launchRestore.sourceHash, launchRestore.status, settingsOverlay])

  useEffect(() => {
    if (launchRestore.status !== 'ready') return
    if (isBaseHash(activeHash)) setLastBaseHash(activeHash)
    if (!shouldPersistLastSurface(activeHash)) return
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
      const previousHash = await resolveSettingsPreviousHash(lastBaseHash)
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
  }, [activeHash, activeRoute.type, lastBaseHash, launchRestore.status])

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
    <div
      className={`${containsMushafViewport ? 'qar:h-dvh qar:overflow-hidden' : 'qar:min-h-screen'} qar:bg-canvas qar:text-text`}
      data-react-route={activeHash}
    >
      <div aria-hidden="true" className="qar-react-night-shift" data-testid="react-night-shift" />
      {launchRestore.status === 'loading' && <LaunchSplash />}
      {launchRestore.status === 'setup' && (
        <Suspense fallback={<LaunchSplash />}>
          <OnboardingRoute
            onComplete={(nextHash) => {
              window.history.replaceState(null, '', nextHash)
              setLaunchRefreshVersion((version) => version + 1)
              setHash(nextHash)
            }}
            onRetryAvailability={() => {
              setLaunchRefreshVersion((version) => version + 1)
            }}
            pendingHash={launchRestore.hash}
            setup={launchRestore.setup}
          />
        </Suspense>
      )}
      {launchRestore.status === 'ready' && (
        <Suspense fallback={<LaunchSplash />}>
          {route.type === 'reader' && (
            <BookmarksProvider>
              <ReaderRoute ayah={route.ayah} preservePosition={Boolean(settingsOverlay)} surah={route.surah} />
            </BookmarksProvider>
          )}
          {route.type === 'mushaf' && (
            <BookmarksProvider>
              <MushafRoute
                interactionSuspended={Boolean(settingsOverlay)}
                onReplaceHash={replaceActiveHash}
                page={route.page}
              />
            </BookmarksProvider>
          )}
          {(route.type === 'surahs' || route.type === 'bookmarks' || route.type === 'unsupported') && (
            <NavigationRouteHost
              statusMessage={
                route.type === 'surahs' ? 'Surahs' : route.type === 'bookmarks' ? 'Bookmarks' : 'Unavailable'
              }
            >
              {route.type === 'surahs' && <SurahsRoute />}
              {route.type === 'bookmarks' && <BookmarksRoute />}
              {route.type === 'unsupported' && <UnsupportedRoute hash={activeHash} />}
            </NavigationRouteHost>
          )}
          {route.type === 'search' && <SearchRoute />}
          {route.type === 'about' && <AboutRoute />}
          {settingsOverlay && (
            <Suspense fallback={null}>
              <SettingsRoute
                initialAssetsExpanded={settingsOverlay.initialAssetsExpanded}
                mode={settingsOverlay.mode}
                onClose={closeSettingsOverlay}
                previousHash={settingsOverlay.previousHash}
                returnFocusId={settingsOverlay.returnFocusId}
              />
            </Suspense>
          )}
        </Suspense>
      )}
    </div>
  )
}

async function resolveSettingsPreviousHash(lastBaseHash: string | null): Promise<string> {
  if (lastBaseHash && isBaseHash(lastBaseHash)) return lastBaseHash
  try {
    const record = await readNativeSetting('lastSurface')
    if (typeof record?.value === 'string' && isReaderHash(record.value)) return record.value
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

function isReaderHash(hash: string): boolean {
  const route = matchReactRoute(hash)
  return route.type === 'reader' || route.type === 'mushaf'
}

function isBaseHash(hash: string): boolean {
  if (isReaderHash(hash)) return true
  const route = matchReactRoute(hash)
  return route.type === 'surahs' || route.type === 'bookmarks' || route.type === 'search' || route.type === 'about'
}

function UnsupportedRoute({ hash }: { hash: string }) {
  return (
    <NavigationPageRecipe title="This link is not supported">
      <Status
        action={
          <Button onClick={() => (window.location.hash = REACT_ROUTES.surahs)} variant="secondary">
            Go to Surah list
          </Button>
        }
        description={`The address ${hash || '#/'} is not recognized by QuranAtlas. Choose a supported destination to continue.`}
        title="Address not recognized"
        tone="warning"
      />
    </NavigationPageRecipe>
  )
}
