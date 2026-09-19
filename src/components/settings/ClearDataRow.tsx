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
        <Button className="qar:text-danger-text" onClick={clearData.open} size="sm" variant="ghost">
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
        <p className="qar:m-0 qar:text-sm qar:leading-6">
          This permanently deletes everything QuranAtlas has stored on this device:
        </p>
        <ul className="qar:m-0 qar:grid qar:gap-1 qar:pl-5 qar:text-sm qar:leading-6 qar:text-muted">
          <li>Saved reading positions</li>
          <li>Bookmarks</li>
          <li>Offline downloads</li>
          <li>Settings, including theme and text choices</li>
          <li>Any older local QuranAtlas data</li>
        </ul>
        <p className="qar:m-0 qar:text-sm qar:font-medium qar:leading-6">This action cannot be undone.</p>
        <Input
          autoComplete="off"
          disabled={clearData.state.pending}
          label="Type DELETE to confirm"
          onChange={(event) => clearData.setInput(event.currentTarget.value)}
          placeholder="DELETE"
          value={clearData.state.input}
        />
        {clearData.state.error ? (
          <p className="qar:m-0 qar:text-sm qar:text-danger-text" role="alert">
            {clearData.state.error}
          </p>
        ) : null}
        {clearData.state.blocked ? (
          <p aria-live="assertive" className="qar:m-0 qar:text-sm qar:text-danger-text" role="alert">
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
