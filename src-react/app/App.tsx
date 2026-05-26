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
import { isReactProductionDeployment } from './deploy-target'
import { getInitialReactHash, matchReactRoute } from './router/routes'

export function App() {
  const initialRoute = useMemo(() => getInitialReactHash(), [])
  const [hash, setHash] = useState(initialRoute)
  const route = matchReactRoute(hash)

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

  return (
    <div className="qar:min-h-screen qar:bg-canvas qar:text-text" data-react-route={hash}>
      <header className="qar:border-b qar:border-border qar:bg-surface qar:px-5 qar:py-3">
        {!isReactProductionDeployment && <p className="qar:m-0 qar:text-xs qar:text-muted">React preview</p>}
        <h1 className="qar:m-0 qar:font-ui qar:text-2xl qar:leading-tight">QuranAtlas</h1>
        {!isReactProductionDeployment && (
          <p className="qar:m-0 qar:max-w-xl qar:text-sm qar:text-muted">
            Isolated React shell. The Svelte app remains the shipped default until cutover.
          </p>
        )}
      </header>
      {route.type === 'reader' && <ReaderRoute ayah={route.ayah} surah={route.surah} />}
      {route.type === 'mushaf' && <MushafRoute page={route.page} />}
      {route.type === 'surahs' && <SurahsRoute />}
      {route.type === 'bookmarks' && <BookmarksRoute />}
      {route.type === 'search' && <SearchRoute />}
      {route.type === 'settings' && <SettingsRoute />}
      {route.type === 'assets' && <AssetsRoute />}
      {route.type === 'about' && <AboutRoute />}
      {route.type === 'onboarding' && <OnboardingRoute />}
    </div>
  )
}
