import { useRef } from 'react'

import { Button, Dialog, Input } from '../ui'
import { SettingsRow } from './SettingsRow'
import { useClearDataDialog } from './useClearDataDialog'

// App-group row for the destructive reset (moved from the About footer):
// the same DELETE-typed confirmation dialog, sentence-cased.
export function ClearDataRow() {
  const clearData = useClearDataDialog()
  const cancelClearDataRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <SettingsRow
        helper="Remove bookmarks, reading positions, downloads, and settings from this device."
        label="Clear all data"
      >
        <Button className="qar:text-danger" onClick={clearData.open} size="sm" variant="ghost">
          Clear all data
        </Button>
      </SettingsRow>
      <Dialog
        initialFocusRef={cancelClearDataRef}
        onOpenChange={(open) => {
          if (open) clearData.open()
          else clearData.close()
        }}
        open={clearData.state.open}
        title="Clear all data?"
      >
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          This will permanently delete saved reading positions, bookmarks, offline downloads, settings, and any older
          local QuranAtlas data still stored on this device. This action cannot be undone.
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
          <Button ref={cancelClearDataRef} disabled={clearData.state.pending} onClick={clearData.close} variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={!clearData.canConfirm}
            onClick={() => {
              void clearData.confirm()
            }}
            variant="danger"
          >
            {clearData.state.pending ? 'Clearing...' : 'Clear all data'}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
