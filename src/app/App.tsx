import { isReaderUpgradeBlocked, subscribeReaderUpgrade } from '../storage/db'
import { Suspense, lazy, startTransition, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import type { SettingsRouteMode } from './routes/settings/SettingsRoute'
import { Button, Status } from '../components/ui'
import { NavigationPageRecipe } from '../design-system/recipes/navigation-page'
import { LaunchSplash } from '../components/launch/LaunchSplash'
import { getInitialReactHash, matchReactRoute, REACT_ROUTES } from './router/routes'
import { subscribeReactSettingsOverlayRequests } from './settings-overlay-events'
import { subscribeReactWirdOverlayRequests } from './wird-overlay-events'
import { shouldPersistLastSurface, useLaunchRestore } from '../continuity/launch-restore'
import { normalizeLastSurface } from '../continuity/last-surface'
import {
  applyReactReaderAppearance,
  subscribeReactReaderPreferencesChanged,
  subscribeReactSystemTheme,
} from '../storage/reader-preferences'
import { reconcileOfflinePacks } from '../offline/download/offline-pack-downloader'
import { readNativeReactReaderPreferences } from '../storage/settings-writer'
import { useWirdReminderScheduler } from '../continuity/wird/use-wird-reminder-scheduler'
import { BookmarksProvider } from '../continuity/bookmarks/use-bookmarks'
import { readNativeSetting, writeNativeSetting } from '../storage/native-reader-store'
import { OfflineOfferPrompt } from '../components/offline/OfflineOfferPrompt'
import { writeOfflineDownloadSetupComplete } from '../launch/offline-download-setup'

const AboutRoute = lazy(() => import('./routes/settings/AboutRoute').then((module) => ({ default: module.AboutRoute })))
const NavigationRouteHost = lazy(() =>
  import('./routes/navigation/NavigationRouteHost').then((module) => ({ default: module.NavigationRouteHost })),
)
const BookmarksRoute = lazy(() =>
  import('./routes/navigation/BookmarksRoute').then((module) => ({ default: module.BookmarksRoute })),
)
const MushafRoute = lazy(() => import('./routes/read/MushafRoute').then((module) => ({ default: module.MushafRoute })))
const ReaderRoute = lazy(() => import('./routes/read/ReaderRoute').then((module) => ({ default: module.ReaderRoute })))
const SettingsRoute = lazy(() =>
  import('./routes/settings/SettingsRoute').then((module) => ({ default: module.SettingsRoute })),
)
const SurahsRoute = lazy(() =>
  import('./routes/navigation/SurahsRoute').then((module) => ({ default: module.SurahsRoute })),
)
const WirdSheet = lazy(() => import('../components/wird/WirdSheet').then((module) => ({ default: module.WirdSheet })))

export function App() {
  useWirdReminderScheduler()
  const [offerDismissed, setOfferDismissed] = useState(false)
  const initialRoute = useMemo(() => getInitialReactHash(), [])
  const [hash, setHash] = useState(initialRoute)
  const [lastBaseHash, setLastBaseHash] = useState<string | null>(null)
  const [settingsOverlay, setSettingsOverlay] = useState<{
    initialAssetsExpanded?: boolean
    mode: SettingsRouteMode
    openHash: string
    previousHash: string
    returnFocusId?: string
  } | null>(null)
  const [wirdOverlay, setWirdOverlay] = useState<{ returnFocusId?: string } | null>(null)
  const upgradeBlocked = useSyncExternalStore(subscribeReaderUpgrade, isReaderUpgradeBlocked, () => false)
  const launchRestore = useLaunchRestore(hash)
  const activeHash = launchRestore.status === 'ready' ? launchRestore.hash : hash
  const activeRoute = matchReactRoute(activeHash)
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
      // Keep the current surface visible while a lazy route chunk loads.
      // Without a transition, the top-level Suspense boundary replaces the
      // whole app with LaunchSplash on the first visit to each route.
      startTransition(() => setHash(nextHash))
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
      if (preferences.theme) {
        applyReactReaderAppearance({ dimPageImages: preferences.dimPageImages, theme: preferences.theme })
      }
    })
    const unsubscribeSystemTheme = subscribeReactSystemTheme()
    return () => {
      active = false
      unsubscribe()
      unsubscribeSystemTheme()
    }
  }, [])

  useEffect(() => {
    if (launchRestore.status !== 'ready') return
    void reconcileOfflinePacks()
  }, [launchRestore.status])

  useEffect(
    () =>
      subscribeReactSettingsOverlayRequests((request) => {
        const previousHash = window.location.hash
        if (!isReaderHash(previousHash)) return
        setLastBaseHash(previousHash)
        setSettingsOverlay({
          mode: settingsModeForHash(previousHash),
          openHash: previousHash,
          previousHash,
          returnFocusId: request.returnFocusId,
        })
      }),
    [],
  )

  useEffect(
    () =>
      subscribeReactWirdOverlayRequests((request) => {
        setWirdOverlay({ returnFocusId: request.returnFocusId })
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
        openHash: activeHash,
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
    const openHash = settingsOverlay?.openHash
    setSettingsOverlay(null)
    if (!previousHash) return
    // G-8: only restore when the hash still matches what was active when the
    // overlay opened (or sits on a transient settings hash); a navigation
    // issued while closing must win.
    const currentHash = window.location.hash
    const navigatedAway =
      currentHash !== openHash && currentHash !== REACT_ROUTES.settings && currentHash !== REACT_ROUTES.assets
    if (navigatedAway) return
    if (currentHash !== previousHash) {
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
      {upgradeBlocked && (
        <Status
          title="Close other QuranAtlas tabs to finish updating."
          description="Your saved reading data is safe. This tab will continue automatically when the other tabs close."
          tone="info"
        />
      )}
      {launchRestore.status === 'loading' && !upgradeBlocked && <LaunchSplash />}
      {launchRestore.status === 'ready' && (
        <Suspense fallback={<LaunchSplash />}>
          {launchRestore.offlineOffer != null && !offerDismissed ? (
            <OfflineOfferPrompt
              offer={launchRestore.offlineOffer}
              onLater={() => {
                // Dismiss only after the completion marker commits, so a quick
                // reload never resurrects the offer for the decided session.
                void writeOfflineDownloadSetupComplete()
                  .catch(() => undefined)
                  .then(() => setOfferDismissed(true))
              }}
            />
          ) : null}
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
              currentRoute={route.type === 'bookmarks' ? 'bookmarks' : null}
              statusMessage={
                route.type === 'surahs' ? 'Surahs' : route.type === 'bookmarks' ? 'Bookmarks' : 'Unavailable'
              }
            >
              {route.type === 'surahs' && <SurahsRoute />}
              {route.type === 'bookmarks' && <BookmarksRoute />}
              {route.type === 'unsupported' && <UnsupportedRoute hash={activeHash} />}
            </NavigationRouteHost>
          )}
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
          {wirdOverlay && (
            <Suspense fallback={null}>
              <WirdSheet onClose={() => setWirdOverlay(null)} returnFocusId={wirdOverlay.returnFocusId} />
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
  return route.type === 'surahs' || route.type === 'bookmarks' || route.type === 'about'
}

function UnsupportedRoute({ hash }: { hash: string }) {
  return (
    <NavigationPageRecipe title="This link is not supported">
      <Status
        action={
          <Button onClick={() => (window.location.hash = REACT_ROUTES.surahs)} variant="primary">
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
