import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

import pkg from '../../../../package.json'
import { REACT_ROUTES } from '../../router/routes'
import { useBookmarks } from '../../../continuity/bookmarks/use-bookmarks'
import { Button, Dialog, Input } from '../../../components/ui'
import { NavDrawer } from '../../../components/navigation/NavDrawer'
import { useNavDrawerController } from '../../../components/navigation/nav-drawer-controller'
import { ReaderChrome } from '../../../components/reader/ReaderChrome'
import { SettingsPageRecipe } from '../../../design-system/recipes/settings-page'
import { hasReactInstallPrompt, initReactInstallPromptListener, promptReactInstall } from './pwa-install'
import { fetchLatestAppChanges, type AppUpdateCheckResult } from './pwa-updates'
import { useClearDataDialog } from './useClearDataDialog'

const credits = [
  "Qur'an text (Hafs, Warsh, Qalun riwayat): King Fahd Glorious Qur'an Printing Complex (مجمع الملك فهد لطباعة المصحف الشريف), Madinah",
  'English translation: Bridges (Quran DB upstream translation source)',
  'Arabic typography: KFGQPC Uthmanic Hafs / Warsh / Qalun (King Fahd Complex). Latin: Newsreader; UI: system. Mono: Geist Mono (SIL OFL).',
  'Built with React, Vite, and Workbox',
]

type UpdateCheckState =
  | AppUpdateCheckResult
  | { status: 'idle'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'error'; message: string }

export function AboutRoute() {
  const clearData = useClearDataDialog()
  const { bookmarks, deleteBookmark } = useBookmarks()
  const { dispatch: dispatchDrawer, state: drawerState } = useNavDrawerController()
  const [installAvailable, setInstallAvailable] = useState(false)
  const [installDone, setInstallDone] = useState(false)
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckState>({
    status: 'idle',
    message: 'Fetch latest app files when QuranAtlas is open as an installed PWA or production preview.',
  })

  useEffect(() => {
    initReactInstallPromptListener()
    setInstallAvailable(hasReactInstallPrompt())
  }, [])

  useEffect(() => {
    if (!drawerState.open) return undefined
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dispatchDrawer({ reason: 'escape', type: 'close' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatchDrawer, drawerState.open])

  async function handleInstall() {
    const outcome = await promptReactInstall()
    setInstallAvailable(false)
    setInstallDone(outcome === 'accepted')
  }

  async function handleFetchLatestChanges() {
    setUpdateCheck({ status: 'checking', message: 'Checking for latest app files...' })

    try {
      setUpdateCheck(await fetchLatestAppChanges())
    } catch {
      setUpdateCheck({
        status: 'error',
        message: 'Could not check for app updates. Check your connection and try again.',
      })
    }
  }

  function navigate(hash: string) {
    window.location.hash = hash
    dispatchDrawer({ type: 'route-transition' })
  }

  const updateCheckPending = updateCheck.status === 'checking' || updateCheck.status === 'reloading'
  const updateButtonLabel = updateCheck.status === 'checking'
    ? 'Checking...'
    : updateCheck.status === 'reloading'
      ? 'Reloading...'
      : 'Fetch latest app'

  return (
    <>
      <ReaderChrome
        mode="verse"
        onModeChange={(mode) => {
          window.location.hash = mode === 'mushaf' ? REACT_ROUTES.mushaf(1) : REACT_ROUTES.home
        }}
        onOpenNavigation={() => dispatchDrawer({ returnFocusId: 'reader-navigation-trigger', type: 'open' })}
        onOpenSettings={() => {
          window.location.hash = REACT_ROUTES.settings
        }}
      />
      {drawerState.open && (
        <div className="qar-react-nav-drawer-overlay" onClick={() => dispatchDrawer({ reason: 'outside', type: 'close' })} role="presentation">
          <NavDrawer
            bookmarks={bookmarks}
            currentLabel="About"
            mode="verse"
            onClose={() => dispatchDrawer({ reason: 'button', type: 'close' })}
            onDeleteBookmark={deleteBookmark}
            onNavigate={navigate}
            open
            showWird={false}
          />
        </div>
      )}
      <SettingsPageRecipe className="qar-react-about-page" title="About">
        <h1 className="qar:m-0 qar:font-ui qar:text-3xl qar:leading-tight">QuranAtlas</h1>
        <p className="qar:m-0 qar:text-base qar:font-medium">Read, reflect, remember.</p>

      <section className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Quran remembrance">
        <p className="qar:m-0 qar:text-right qar:text-2xl qar:leading-relaxed" dir="rtl" lang="ar">
          وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٍ
        </p>
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          "And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?" - 54:17
        </p>
      </section>

      <section className="qar:grid qar:gap-3" aria-labelledby="react-about-attribution">
        <h2 className="qar:m-0 qar:text-lg qar:leading-tight" id="react-about-attribution">Attribution</h2>
        <ul className="qar:m-0 qar:grid qar:gap-2 qar:pl-5 qar:text-sm qar:leading-6 qar:text-muted">
          {credits.map((credit) => <li key={credit}>{credit}</li>)}
        </ul>
      </section>

      {installAvailable || installDone ? (
        <section aria-label="Install QuranAtlas">
          <Button aria-label="Install QuranAtlas to your home screen" disabled={installDone} onClick={() => { void handleInstall() }} variant="primary">
            {installDone ? 'Installed!' : 'Install App'}
          </Button>
        </section>
      ) : null}

      <p className="qar:m-0 qar:text-sm qar:text-muted" data-testid="about-version">
        v{pkg.version} · dev
      </p>

      <section className="qar:grid qar:gap-2 qar:border-t qar:border-border qar:pt-4" aria-labelledby="react-about-app-updates">
        <h2 className="qar:m-0 qar:text-lg qar:leading-tight" id="react-about-app-updates">App updates</h2>
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted" id="react-about-app-updates-status" aria-live="polite">
          {updateCheck.message}
        </p>
        <div>
          <Button
            aria-describedby="react-about-app-updates-status"
            disabled={updateCheckPending}
            onClick={() => { void handleFetchLatestChanges() }}
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
            {updateButtonLabel}
          </Button>
        </div>
      </section>

      <section className="qar:border-t qar:border-border qar:pt-4" aria-label="Clear local data">
        <Dialog
          onOpenChange={(open) => {
            if (open) clearData.open()
            else clearData.close()
          }}
          open={clearData.state.open}
          title="Clear All Data?"
          trigger={<Button variant="danger">Clear all data</Button>}
        >
          <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
            This will permanently delete saved reading positions, bookmarks, offline downloads, settings, and any older local QuranAtlas data still stored on this device. This action cannot be undone.
          </p>
          <Input
            autoComplete="off"
            disabled={clearData.state.pending}
            label="Type DELETE to confirm"
            onChange={(event) => clearData.setInput(event.currentTarget.value)}
            placeholder="DELETE"
            value={clearData.state.input}
          />
          {clearData.state.error ? <p className="qar:m-0 qar:text-sm qar:text-danger">{clearData.state.error}</p> : null}
          <div className="qar:flex qar:flex-wrap qar:justify-end qar:gap-2">
            <Button disabled={clearData.state.pending} onClick={clearData.close} variant="ghost">Cancel</Button>
            <Button disabled={!clearData.canConfirm} onClick={() => { void clearData.confirm() }} variant="danger">
              {clearData.state.pending ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </div>
        </Dialog>
      </section>
      </SettingsPageRecipe>
    </>
  )
}
