import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import pkg from '../../../../package.json'
import { REACT_ROUTES } from '../../router/routes'
import { ChromeFrame } from '../../../components/navigation/ChromeFrame'
import { useNavDrawerController } from '../../../components/navigation/nav-drawer-controller'
import { Button, Dialog, Input } from '../../../components/ui'
import { SettingsGroup } from '../../../components/settings/SettingsGroup'
import { SettingsPageRecipe } from '../../../design-system/recipes/settings-page'
import { hasReactInstallPrompt, initReactInstallPromptListener, promptReactInstall } from './pwa-install'
import { fetchLatestAppChanges, type AppUpdateCheckResult } from './pwa-updates'
import { useClearDataDialog } from './useClearDataDialog'

// S10 About & Sources — fixed structure: Sources used (no framework names) /
// Numbering and references (shared with the S2 passage-group explainer) /
// Report an issue / App (version, updates, technical credits last and
// visually secondary).
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
      onOpenSettings={() => {
        window.location.hash = REACT_ROUTES.settings
      }}
    >
      <SettingsPageRecipe title="About">
        <p className="qar:m-0 qar:text-base qar:font-medium">Read, reflect, remember.</p>

        <SettingsGroup title="Sources used">
          <ul className="qar:m-0 qar:grid qar:gap-2 qar:list-disc qar:pl-5 qar:text-sm qar:leading-6 qar:text-muted qar:marker:text-muted">
            {sources.map((source) => (
              <li key={source.id}>{source.content}</li>
            ))}
          </ul>
        </SettingsGroup>

        <SettingsGroup title="Numbering and references">
          <p className="qar:m-0 qar:text-sm qar:leading-6">
            This translation renders one passage across several verses. Verse references follow the Hafs counting; the
            printed Qalūn edition may number these verses differently. Nothing is missing or repeated — the words are
            the same. Furatiyyah page numbers are the edition's own printed pagination, and page-start references are
            mapped to the nearest printed page.
          </p>
        </SettingsGroup>

        <SettingsGroup title="Report an issue">
          <p className="qar:m-0">
            <a href="https://github.com/Omar-MD/QuranAtlas/issues" rel="noreferrer" target="_blank">
              Report an issue
            </a>
          </p>
        </SettingsGroup>

        <SettingsGroup title="App">
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
          <div>
            <Button
              aria-describedby="react-about-app-updates-status"
              disabled={updateCheckPending || !online}
              onClick={() => {
                void handleFetchLatestChanges()
              }}
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />
              {updateCheckPending ? 'Checking...' : 'Check for updates'}
            </Button>
          </div>
          <Dialog
            initialFocusRef={cancelClearDataRef}
            onOpenChange={(open) => {
              if (open) clearData.open()
              else clearData.close()
            }}
            open={clearData.state.open}
            title="Clear All Data?"
            trigger={
              <Button size="sm" variant="secondary">
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
          {/* Technical credits: last and visually secondary (S10 item 4). */}
          <p className="qar:m-0 qar:pt-2 qar:text-xs qar:leading-5 qar:text-muted">
            Built with React, Vite, and Workbox.
          </p>
        </SettingsGroup>
      </SettingsPageRecipe>
    </ChromeFrame>
  )
}
