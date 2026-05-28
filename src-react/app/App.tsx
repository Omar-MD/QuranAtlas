import { useEffect, useMemo, useState } from 'react'

import { AssetsRoute } from './routes/settings/AssetsRoute'
import { AboutRoute } from './routes/settings/AboutRoute'
import { BookmarksRoute } from './routes/navigation/BookmarksRoute'
import { MushafRoute } from './routes/read/MushafRoute'
import { OnboardingRoute } from './routes/onboarding/OnboardingRoute'
import { ReaderRoute } from './routes/read/ReaderRoute'
import { SearchRoute } from './routes/search/SearchRoute'
import { SettingsRoute } from './routes/settings/SettingsRoute'
import { SurahsRoute } from './routes/navigation/SurahsRoute'
import { LaunchSplash } from '../components/launch/LaunchSplash'
import { isReactProductionDeployment } from './deploy-target'
import { getInitialReactHash, matchReactRoute } from './router/routes'
import { shouldPersistLastSurface, useLaunchRestore } from '../continuity/launch-restore'
import { writeLastSurface } from '../continuity/last-surface'
import { openReactDb } from '../storage/db'

export function App() {
  const initialRoute = useMemo(() => getInitialReactHash(), [])
  const [hash, setHash] = useState(initialRoute)
  const launchRestore = useLaunchRestore(hash)
  const activeHash = launchRestore.status === 'ready' ? launchRestore.hash : hash
  const route = matchReactRoute(activeHash)
  const showHeader = launchRestore.status !== 'ready' || !['onboarding', 'reader', 'mushaf'].includes(route.type)

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', initialRoute)
    }
    function syncHash() {
      setHash(getInitialReactHash())
    }
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    if (launchRestore.status !== 'ready' || launchRestore.sourceHash !== hash || launchRestore.hash === hash) return
    window.history.replaceState(null, '', launchRestore.hash)
  }, [hash, launchRestore.hash, launchRestore.sourceHash, launchRestore.status])

  useEffect(() => {
    if (launchRestore.status !== 'ready' || !shouldPersistLastSurface(activeHash)) return
    let active = true
    void openReactDb().then((db) => {
      if (active) return writeLastSurface(db, activeHash)
      return undefined
    })
    return () => {
      active = false
    }
  }, [activeHash, launchRestore.status])

  return (
    <div className="qar:min-h-screen qar:bg-canvas qar:text-text" data-react-route={activeHash}>
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
      {launchRestore.status === 'ready' && route.type === 'search' && <SearchRoute />}
      {launchRestore.status === 'ready' && route.type === 'settings' && <SettingsRoute />}
      {launchRestore.status === 'ready' && route.type === 'assets' && <AssetsRoute />}
      {launchRestore.status === 'ready' && route.type === 'about' && <AboutRoute />}
      {launchRestore.status === 'ready' && route.type === 'onboarding' && (
        <OnboardingRoute onComplete={(nextHash) => {
          window.history.replaceState(null, '', nextHash)
          setHash(nextHash)
        }} />
      )}
    </div>
  )
}
