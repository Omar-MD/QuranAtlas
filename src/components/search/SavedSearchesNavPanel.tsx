import { Pencil, Trash2 } from 'lucide-react'

import type { SavedSearchRecord } from '../../storage/types'
import { Button, IconButton } from '../ui'

export function SavedSearchesNavPanel({
  onDelete,
  onLoad,
  onRename,
  records,
}: {
  onDelete: (id: string) => void
  onLoad: (record: SavedSearchRecord) => void
  onRename: (id: string, name: string) => void
  records: SavedSearchRecord[]
}) {
  return (
    <aside aria-label="Saved searches" className="qar-react-nav-drawer-saved-searches">
      <div className="qar-react-nav-drawer-saved-searches-head">
        <p className="qar-react-nav-drawer-saved-searches-kicker">Search</p>
        <h2 className="qar-react-nav-drawer-saved-searches-title">Saved searches</h2>
      </div>
      {records.length === 0 ? (
        <p className="qar-react-nav-drawer-list-state" role="status">
          No saved searches yet.
        </p>
      ) : (
        <ul className="qar-react-nav-drawer-saved-searches-list">
          {records.map((record) => (
            <li className="qar-react-nav-drawer-saved-searches-row" key={record.id}>
              <Button
                aria-label={`Load saved search ${record.intent.name}`}
                className="qar-react-nav-drawer-saved-searches-load"
                dir="auto"
                onClick={() => onLoad(record)}
                variant="ghost"
              >
                <span className="qar-react-nav-drawer-saved-searches-name"><bdi>{record.intent.name}</bdi></span>
                <span className="qar-react-nav-drawer-saved-searches-query"><bdi>{record.intent.queryText}</bdi></span>
              </Button>
              <div className="qar-react-nav-drawer-saved-searches-actions">
                <IconButton
                  className="qar-react-nav-drawer-saved-searches-action"
                  label={`Rename saved search ${record.intent.name}`}
                  onClick={() => onRename(record.id, record.intent.name)}
                >
                  <Pencil aria-hidden="true" size={15} strokeWidth={1.7} />
                </IconButton>
                <IconButton
                  className="qar-react-nav-drawer-saved-searches-action"
                  label={`Delete saved search ${record.intent.name}`}
                  onClick={() => onDelete(record.id)}
                >
                  <Trash2 aria-hidden="true" size={15} strokeWidth={1.7} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
