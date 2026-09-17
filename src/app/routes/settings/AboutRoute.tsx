import { ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import pkg from '../../../../package.json'
import { REACT_ROUTES } from '../../router/routes'
import { ChromeFrame } from '../../../components/navigation/ChromeFrame'
import { useNavDrawerController } from '../../../components/navigation/nav-drawer-controller'
import { Button, ChoiceButton, Dialog, Input } from '../../../components/ui'
import { NotationGuideButton } from '../../../components/settings/NotationGuide'
import { SettingsPageRecipe } from '../../../design-system/recipes/settings-page'
import { hasReactInstallPrompt, initReactInstallPromptListener, promptReactInstall } from './pwa-install'
import { fetchLatestAppChanges, type AppUpdateCheckResult } from './pwa-updates'
import { useClearDataDialog } from './useClearDataDialog'

const sources: Array<{ content: ReactNode; id: string }> = [
  {
    content: (
      <>
        Qur’an text (Qalūn riwayah):{' '}
        <a href="https://qurancomplex.gov.sa/en/techquran/dev/" rel="noreferrer" target="_blank">
          King Fahd Complex source
        </a>{' '}
        (
        <span dir="rtl" lang="ar" className="qar:whitespace-nowrap">
          مجمع الملك فهد لطباعة المصحف الشريف
        </span>
        ), Madinah. KFGQPC Quran text source; restricted terms apply.
      </>
    ),
    id: 'quran-text',
  },
  {
    content: (
      <>
        English translation: Bridges — Fadel Soliman ({' '}
        <a href="https://qul.tarteel.ai/resources/translation/179" rel="noreferrer" target="_blank">
          Bridges translation source
        </a>
        ). QUL downloadable resource.
      </>
    ),
    id: 'translation',
  },
  {
    content: (
      <>
        Mushaf editions: <span>Qalun Quran.ws (minimal monochrome pages)</span> —{' '}
        <a href="https://quran.ws" rel="noreferrer" target="_blank">
          Quran.ws page source
        </a>
        . Quran.ws page assets free use. Qalun Furatiyyah 2023 uses coloured notation and marginal notes; its
        private-source redistribution is limited to the user-authorized QuranAtlas noncommercial deployment.{' '}
        <a
          href="https://github.com/Omar-MD/QuranAtlas/blob/dev/data/catalog/mushaf-assets.json"
          rel="noreferrer"
          target="_blank"
        >
          Furatiyyah source record
        </a>
        .
      </>
    ),
    id: 'editions',
  },
  {
    content: (
      <>
        Arabic typography: KFGQPC Uthmanic Qaloon ({' '}
        <a href="https://qurancomplex.gov.sa/en/techquran/dev/" rel="noreferrer" target="_blank">
          King Fahd Complex typography source
        </a>
        ). Latin: Newsreader (SIL Open Font License).
      </>
    ),
    id: 'typography',
  },
]

type UpdateCheckState =
  | AppUpdateCheckResult
  | { status: 'idle'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'error'; message: string }

export function AboutRoute() {
  const clearData = useClearDataDialog()
  const cancelClearDataRef = useRef<HTMLButtonElement>(null)
  const drawer = useNavDrawerController()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [installAvailable, setInstallAvailable] = useState(false)
  const [installDone, setInstallDone] = useState(false)
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckState>({
    message: 'Check for the latest app files.',
    status: 'idle',
  })

  useEffect(() => {
    initReactInstallPromptListener()
    setInstallAvailable(hasReactInstallPrompt())
    function syncOnlineState() {
      setOnline(typeof navigator === 'undefined' || navigator.onLine)
    }
    window.addEventListener('online', syncOnlineState)
    window.addEventListener('offline', syncOnlineState)
    return () => {
      window.removeEventListener('online', syncOnlineState)
      window.removeEventListener('offline', syncOnlineState)
    }
  }, [])

  async function handleInstall() {
    const outcome = await promptReactInstall()
    setInstallAvailable(false)
    setInstallDone(outcome === 'accepted')
  }

  async function handleFetchLatestChanges() {
    if (!online) return
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

  const updateCheckPending = updateCheck.status === 'checking' || updateCheck.status === 'reloading'

  return (
    <ChromeFrame
      controller={drawer}
      currentRoute="about"
      onOpenSettings={() => {
        window.location.hash = REACT_ROUTES.settings
      }}
    >
      <SettingsPageRecipe className="qar-about-page qar:mx-auto qar:w-full qar:max-w-xl" title="About">
        <p className="qar:m-0 qar:text-base qar:font-medium">Read, reflect, remember.</p>

        <NotationGuideButton />

        {/* G-7: a second disclosure row matching the notation row idiom; the
            attribution fine print lives inside its expanded content. */}
        <div className="qar:grid qar:gap-2">
          <ChoiceButton
            aria-controls="about-sources-content"
            aria-expanded={sourcesOpen}
            className="qar-about-notation-row"
            data-testid="sources-licenses-button"
            onClick={() => setSourcesOpen((open) => !open)}
          >
            <span className="qar-about-notation-row-copy">Sources and licenses</span>
            <ChevronRight aria-hidden="true" className="qar-about-notation-row-chevron" size={16} strokeWidth={1.7} />
          </ChoiceButton>
          {sourcesOpen ? (
            <div className="qar:grid qar:gap-2" id="about-sources-content">
              <ul className="qar:m-0 qar:grid qar:gap-2 qar:list-disc qar:pl-5 qar:text-sm qar:leading-6 qar:text-muted qar:marker:text-muted">
                {sources.map((source) => (
                  <li key={source.id}>{source.content}</li>
                ))}
              </ul>
              <p className="qar:m-0 qar:text-xs qar:leading-5 qar:text-muted">Built with React, Vite, and Workbox.</p>
              <div className="qar-about-fine-print qar:text-muted">
                <p className="qar:m-0">Qalūn text · KFGQPC restricted terms.</p>
                <p className="qar:m-0">Bridges · Fadel Soliman / QUL.</p>
                <p className="qar:m-0">Quran.ws · free use; Furatiyyah 2023 · noncommercial.</p>
                <p className="qar:m-0">KFGQPC Uthmanic Qaloon · Newsreader (OFL).</p>
              </div>
            </div>
          ) : null}
        </div>

        <a
          className="qar:flex qar:min-h-11 qar:items-center qar:gap-1 qar:justify-self-start qar:text-sm qar:text-muted"
          href="https://github.com/Omar-MD/QuranAtlas/issues"
          rel="noreferrer"
          target="_blank"
        >
          Report an issue
          <ExternalLink aria-hidden="true" size={14} strokeWidth={1.7} />
        </a>

        <footer className="qar:grid qar:gap-3 qar:border-t qar:border-border qar:pt-3">
          <p className="qar:m-0 qar:text-sm qar:text-muted" data-testid="about-version">
            Version {pkg.version}
          </p>
          {installAvailable || installDone ? (
            <div>
              <Button
                aria-label="Install QuranAtlas to your home screen"
                disabled={installDone}
                onClick={() => {
                  void handleInstall()
                }}
                variant="primary"
              >
                {installDone ? 'Installed!' : 'Install App'}
              </Button>
            </div>
          ) : null}
          <p
            aria-live="polite"
            className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted"
            id="react-about-app-updates-status"
          >
            {online ? updateCheck.message : 'Connect to the internet to check for updates.'}
          </p>
          <Button
            aria-describedby="react-about-app-updates-status"
            className="qar:justify-self-start"
            disabled={updateCheckPending || !online}
            onClick={() => {
              void handleFetchLatestChanges()
            }}
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
            {updateCheckPending ? 'Checking...' : 'Check for updates'}
          </Button>
          <Dialog
            initialFocusRef={cancelClearDataRef}
            onOpenChange={(open) => {
              if (open) clearData.open()
              else clearData.close()
            }}
            open={clearData.state.open}
            title="Clear All Data?"
            trigger={
              <Button className="qar:justify-self-start qar:text-danger" size="sm" variant="ghost">
                Clear all data
              </Button>
            }
          >
            <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
              This will permanently delete saved reading positions, bookmarks, offline downloads, settings, and any
              older local QuranAtlas data still stored on this device. This action cannot be undone.
            </p>
            <Input
              autoComplete="off"
              disabled={clearData.state.pending}
              label="Type DELETE to confirm"
              onChange={(event) => clearData.setInput(event.currentTarget.value)}
              placeholder="DELETE"
              value={clearData.state.input}
            />
            {clearData.state.error ? (
              <p className="qar:m-0 qar:text-sm qar:text-danger" role="alert">
                {clearData.state.error}
              </p>
            ) : null}
            {clearData.state.blocked ? (
              <p aria-live="assertive" className="qar:m-0 qar:text-sm qar:text-danger" role="alert">
                The local database is still in use. Close other QuranAtlas tabs or windows, then try again.
              </p>
            ) : null}
            <div className="qar:flex qar:flex-wrap qar:justify-end qar:gap-2">
              <Button
                ref={cancelClearDataRef}
                disabled={clearData.state.pending}
                onClick={clearData.close}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={!clearData.canConfirm}
                onClick={() => {
                  void clearData.confirm()
                }}
                variant="danger"
              >
                {clearData.state.pending ? 'Clearing...' : 'Clear All Data'}
              </Button>
            </div>
          </Dialog>
        </footer>
      </SettingsPageRecipe>
    </ChromeFrame>
  )
}
