import { useEffect, useMemo, useState } from 'react'

import { AboutRoute } from './routes/settings/AboutRoute'
import { BookmarksRoute } from './routes/navigation/BookmarksRoute'
import { MushafRoute } from './routes/read/MushafRoute'
import { OnboardingRoute } from './routes/onboarding/OnboardingRoute'
import { ReaderRoute } from './routes/read/ReaderRoute'
import { SettingsRoute, type SettingsRouteMode } from './routes/settings/SettingsRoute'
import { SurahsRoute } from './routes/navigation/SurahsRoute'
import { LaunchSplash } from '../components/launch/LaunchSplash'
import { isReactProductionDeployment } from './deploy-target'
import { getInitialReactHash, matchReactRoute, REACT_ROUTES } from './router/routes'
import { subscribeReactSettingsOverlayRequests } from './settings-overlay-events'
import { shouldPersistLastSurface, useLaunchRestore } from '../continuity/launch-restore'
import { writeLastSurface } from '../continuity/last-surface'
import { openReactDb } from '../storage/db'
import { resolveMushafHrefForVerseRoute, resolveVerseHrefForMushafPage } from '../components/reader/reader-mode-routing'
import { applyReactReaderAppearance, subscribeReactReaderPreferencesChanged } from '../storage/reader-preferences'
import { readReactReaderPreferences } from '../storage/settings-writer'

export function App() {
  const initialRoute = useMemo(() => getInitialReactHash(), [])
  const [hash, setHash] = useState(initialRoute)
  const [lastReaderHash, setLastReaderHash] = useState<string | null>(null)
  const [settingsOverlay, setSettingsOverlay] = useState<{
    mode: SettingsRouteMode
    previousHash: string
    verseHash?: string
  } | null>(null)
  const launchRestore = useLaunchRestore(hash)
  const activeHash = launchRestore.status === 'ready' ? launchRestore.hash : hash
  const activeRoute = matchReactRoute(activeHash)
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
  const showHeader = launchRestore.status !== 'ready' || !['onboarding', 'reader', 'mushaf'].includes(route.type)

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
    void openReactDb()
      .then(readReactReaderPreferences)
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

  useEffect(() => subscribeReactSettingsOverlayRequests((requestedMode) => {
    const previousHash = window.location.hash
    if (!shouldPersistLastSurface(previousHash)) return
    const mode = requestedMode ?? (previousHash.startsWith('#/m/') ? 'mushaf' : 'verse')
    setLastReaderHash(previousHash)
    setSettingsOverlay({ mode, previousHash, verseHash: currentReaderVerseHash(previousHash) })
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
    void openReactDb().then((db) => {
      if (active) return writeLastSurface(db, activeHash)
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
      const previousHash = await resolveSettingsPreviousHash(lastReaderHash)
      if (!active) return
      setSettingsOverlay({
        mode: previousHash.startsWith('#/m/') ? 'mushaf' : 'verse',
        previousHash,
        verseHash: currentReaderVerseHash(previousHash),
      })
      window.history.replaceState(null, '', previousHash)
      setHash(previousHash)
    }

    void openSettingsOverlay()
    return () => {
      active = false
    }
  }, [activeRoute.type, lastReaderHash, launchRestore.status])

  function closeSettingsOverlay() {
    const previousHash = settingsOverlay?.previousHash
    setSettingsOverlay(null)
    if (previousHash && window.location.hash !== previousHash) {
      window.history.replaceState(null, '', previousHash)
      setHash(previousHash)
    }
  }

  function updateSettingsReaderHash(nextHash: string, mode: SettingsRouteMode, verseHash?: string | null) {
    setSettingsOverlay((current) => current
      ? {
          ...current,
          mode,
          previousHash: nextHash,
          verseHash: verseHash === undefined ? current.verseHash : verseHash ?? undefined,
        }
      : current)
    window.history.replaceState(null, '', nextHash)
    setHash(nextHash)
  }

  function changeSettingsReaderMode(nextMode: SettingsRouteMode) {
    const previousHash = settingsOverlay?.previousHash ?? lastReaderHash ?? '#/s/1'
    const previousRoute = matchReactRoute(previousHash)
    if (nextMode === 'mushaf') {
      if (previousRoute.type === 'mushaf') return
      if (previousRoute.type === 'reader') {
        const liveVerse = currentReaderVerseRef(previousHash)
        const verseRef = liveVerse ?? { surah: previousRoute.surah, verse: previousRoute.ayah ?? 1 }
        void resolveMushafHrefForVerseRoute({
          explicitVerse: Boolean(liveVerse || previousRoute.ayah !== undefined),
          surah: verseRef.surah,
          verse: verseRef.verse,
        }).then((nextHash) => updateSettingsReaderHash(
          nextHash,
          'mushaf',
          liveVerse ? REACT_ROUTES.surah(liveVerse.surah, liveVerse.verse) : currentReaderVerseHash(previousHash),
        ))
        return
      }
      updateSettingsReaderHash('#/m/1', 'mushaf')
      return
    }

    if (previousRoute.type === 'reader') return
    if (previousRoute.type === 'mushaf') {
      if (settingsOverlay?.verseHash) {
        updateSettingsReaderHash(settingsOverlay.verseHash, 'verse', settingsOverlay.verseHash)
        return
      }
      void resolveVerseHrefForMushafPage(previousRoute.page)
        .then((nextHash) => updateSettingsReaderHash(nextHash, 'verse'))
      return
    }
    updateSettingsReaderHash('#/s/1', 'verse')
  }

  return (
    <div className="qar:min-h-screen qar:bg-canvas qar:text-text" data-react-route={activeHash}>
      <div aria-hidden="true" className="qar-react-night-shift" data-testid="react-night-shift" />
      {showHeader && (
        <header className="qar:border-b qar:border-border qar:bg-surface qar:px-5 qar:py-3">
          {!isReactProductionDeployment && <p className="qar:m-0 qar:text-xs qar:text-muted">React preview</p>}
          <h1 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">QuranAtlas</h1>
          {!isReactProductionDeployment && (
            <p className="qar:m-0 qar:max-w-xl qar:text-sm qar:text-muted">
              Isolated React shell. The Svelte app remains the shipped default until cutover.
            </p>
          )}
        </header>
      )}
      {launchRestore.status === 'loading' && (
        <LaunchSplash />
      )}
      {launchRestore.status === 'ready' && route.type === 'reader' && <ReaderRoute ayah={route.ayah} surah={route.surah} />}
      {launchRestore.status === 'ready' && route.type === 'mushaf' && <MushafRoute page={route.page} />}
      {launchRestore.status === 'ready' && route.type === 'surahs' && <SurahsRoute />}
      {launchRestore.status === 'ready' && route.type === 'bookmarks' && <BookmarksRoute />}
      {launchRestore.status === 'ready' && route.type === 'about' && <AboutRoute />}
      {launchRestore.status === 'ready' && route.type === 'unsupported' && <UnsupportedRoute />}
      {launchRestore.status === 'ready' && route.type === 'onboarding' && (
        <OnboardingRoute onComplete={(nextHash) => {
          window.history.replaceState(null, '', nextHash)
          setHash(nextHash)
        }} />
      )}
      {launchRestore.status === 'ready' && settingsOverlay && (
        <SettingsRoute
          mode={settingsOverlay.mode}
          onClose={closeSettingsOverlay}
          onReaderModeChange={changeSettingsReaderMode}
          previousHash={settingsOverlay.previousHash}
        />
      )}
    </div>
  )
}

async function resolveSettingsPreviousHash(lastReaderHash: string | null): Promise<string> {
  if (lastReaderHash && shouldPersistLastSurface(lastReaderHash)) return lastReaderHash
  try {
    const db = await openReactDb()
    const record = await db.settings.get('lastSurface')
    if (typeof record?.value === 'string' && shouldPersistLastSurface(record.value)) return record.value
  } catch {
    // Fall through to the default reader route.
  }
  return '#/s/1'
}

type ReaderVerseRef = { surah: number; verse: number }

function currentReaderVerseHash(hash: string): string | undefined {
  const ref = currentReaderVerseRef(hash)
  return ref ? REACT_ROUTES.surah(ref.surah, ref.verse) : undefined
}

function currentReaderVerseRef(hash: string): ReaderVerseRef | null {
  const route = matchReactRoute(hash)
  if (route.type !== 'reader') return null
  return findVisibleReaderVerse(route.surah) ?? (
    route.ayah === undefined ? null : { surah: route.surah, verse: route.ayah }
  )
}

function findVisibleReaderVerse(surah: number): ReaderVerseRef | null {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const centerY = viewportHeight / 2
  let firstMatching: ReaderVerseRef | null = null
  let closest: { distance: number; ref: ReaderVerseRef } | null = null

  for (const element of document.querySelectorAll<HTMLElement>('.qar-reader-verse[data-token-key]')) {
    const ref = parseReaderVerseKey(element.dataset.tokenKey ?? '')
    if (!ref || ref.surah !== surah) continue
    firstMatching ??= ref
    if (!viewportHeight) continue
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue
    const distance = rect.top <= centerY && rect.bottom >= centerY
      ? 0
      : Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY))
    if (!closest || distance < closest.distance) closest = { distance, ref }
    if (distance === 0) break
  }

  return closest?.ref ?? firstMatching
}

function parseReaderVerseKey(verseKey: string): ReaderVerseRef | null {
  const [surahPart, versePart] = verseKey.split(':')
  const surah = Number.parseInt(surahPart ?? '', 10)
  const verse = Number.parseInt(versePart ?? '', 10)
  if (!Number.isInteger(surah) || !Number.isInteger(verse) || surah < 1 || surah > 114 || verse < 1) return null
  return { surah, verse }
}

function UnsupportedRoute() {
  return (
    <main className="qar:grid qar:mx-auto qar:w-full qar:max-w-2xl qar:gap-3 qar:px-5 qar:py-8" aria-label="Unsupported route">
      <p className="qar:m-0 qar:text-xs qar:font-medium qar:uppercase qar:tracking-wide qar:text-muted">Unavailable</p>
      <h2 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">Route unavailable</h2>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Search is planned future work and is not part of the current QuranAtlas MVP.
      </p>
    </main>
  )
}
