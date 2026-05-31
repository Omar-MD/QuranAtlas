import type { SavedSearchRecord } from '../../storage/types'
import { Button } from '../ui'

export function SavedSearchesRail({
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
    <aside aria-label="Saved searches" className="qar:grid qar:content-start qar:gap-3">
      <h2 className="qar:m-0 qar:text-base qar:leading-tight">Saved searches</h2>
      {records.length === 0 ? (
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          No saved searches yet. Save a search to return to its query and filters.
        </p>
      ) : (
        <div className="qar:grid qar:gap-2">
          {records.map((record) => (
            <article className="qar:grid qar:gap-2 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-3" key={record.id}>
              <Button
                className="qar:justify-start qar:px-0 qar:text-left qar:text-sm qar:font-semibold"
                dir="auto"
                onClick={() => onLoad(record)}
                variant="ghost"
              >
                <bdi>{record.intent.name}</bdi>
              </Button>
              <p className="qar:m-0 qar:text-xs qar:text-muted" dir="auto"><bdi>{record.intent.queryText}</bdi></p>
              <div className="qar:flex qar:flex-wrap qar:gap-2">
                <Button onClick={() => onRename(record.id, record.intent.name)} size="sm" variant="secondary">Rename</Button>
                <Button onClick={() => onDelete(record.id)} size="sm" variant="ghost">Delete</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </aside>
  )
}
