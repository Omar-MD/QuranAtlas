import { useEffect, useState } from 'react'

import { fetchLatestAppChanges, type AppUpdateCheckResult } from '../../launch/pwa-updates'
import { Button } from '../ui'
import { SettingsRow } from './SettingsRow'

type UpdateCheckState =
  | AppUpdateCheckResult
  | { status: 'idle'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'error'; message: string }

// App-group row (moved from the About footer so every lifecycle action lives
// in Settings). The helper line carries the status; the sr-only live region
// announces its changes.
export function AppUpdatesRow() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [updateCheck, setUpdateCheck] = useState<UpdateCheckState>({
    message: 'Check for the latest app files.',
    status: 'idle',
  })

  useEffect(() => {
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
  const statusText = online ? updateCheck.message : 'Connect to the internet to check for updates.'

  return (
    <>
      <SettingsRow helper={statusText} label="App updates">
        <Button
          disabled={updateCheckPending || !online}
          onClick={() => {
            void handleFetchLatestChanges()
          }}
          size="sm"
          variant="secondary"
        >
          {updateCheckPending ? 'Checking...' : 'Check for updates'}
        </Button>
      </SettingsRow>
      <p aria-live="polite" className="qar:sr-only">
        {statusText}
      </p>
    </>
  )
}
