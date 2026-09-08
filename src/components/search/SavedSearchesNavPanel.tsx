import { X } from 'lucide-react'
import { useEffect, useRef, type MouseEvent } from 'react'

import type { SavedSearchRecord } from '../../storage/types'
import { Button, IconButton, ListRow } from '../ui'

export function SavedSearchesNavPanel({
  lastDeleted,
  onDelete,
  onLoad,
  onUndoDelete,
  records,
}: {
  lastDeleted?: SavedSearchRecord | null
  onDelete: (id: string) => void
  onLoad: (record: SavedSearchRecord) => void
  onUndoDelete?: () => void
  records: SavedSearchRecord[]
}) {
  const listRef = useRef<HTMLElement>(null)
  const pendingFocusIndexRef = useRef<number | null>(null)

  // After a delete re-render lands, restore focus to the next remaining row's
  // delete control, else the previous one, else the persistent list container.
  // biome-ignore lint/correctness/useExhaustiveDependencies: records is the re-render trigger that consumes the pending focus index
  useEffect(() => {
    const index = pendingFocusIndexRef.current
    if (index == null) return
    pendingFocusIndexRef.current = null
    const deletes = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('.qar-react-nav-row-delete') ?? [])
    const target = deletes[Math.min(index, deletes.length - 1)]
    if (target) target.focus()
    else listRef.current?.focus()
  }, [records])

  function handleDelete(id: string, event: MouseEvent<HTMLButtonElement>) {
    const buttons = Array.from(listRef.current?.querySelectorAll('.qar-react-nav-row-delete') ?? [])
    pendingFocusIndexRef.current = buttons.indexOf(event.currentTarget)
    onDelete(id)
  }

  return (
    <aside aria-label="Saved searches" className="qar-react-nav-drawer-saved-searches" ref={listRef} tabIndex={-1}>
      <div className="qar-react-nav-drawer-saved-searches-head">
        <p className="qar-react-nav-drawer-saved-searches-kicker">Search</p>
        <h2 className="qar-react-nav-drawer-saved-searches-title">Saved searches</h2>
      </div>
      {lastDeleted ? (
        <div className="qar-react-nav-drawer-saved-searches-undo" role="status">
          <p>
            Deleted <bdi>{lastDeleted.intent.name}</bdi>
          </p>
          <Button disabled={!onUndoDelete} onClick={onUndoDelete} size="sm" type="button" variant="secondary">
            Undo
          </Button>
        </div>
      ) : null}
      {records.length === 0 ? (
        <p className="qar-react-nav-drawer-list-state" role="status">
          No saved searches yet.
        </p>
      ) : (
        <ul className="qar-react-nav-drawer-saved-searches-list">
          {records.map((record) => (
            <li key={record.id}>
              <ListRow
                action={
                  <>
                    <span aria-hidden="true" className="qar-react-list-row-chevron">
                      ›
                    </span>
                    <IconButton
                      className="qar-react-nav-row-delete"
                      label={`Delete saved search ${record.intent.name}`}
                      onClick={(event) => handleDelete(record.id, event)}
                    >
                      <X aria-hidden="true" size={16} />
                    </IconButton>
                  </>
                }
                meta={<bdi>{record.intent.queryText}</bdi>}
                onSelect={() => onLoad(record)}
                title={<bdi>{record.intent.name}</bdi>}
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
