import { cn } from '../../design-system/utils/cn'
import type { SavedSearchRecord } from '../../storage/types'
import { Button } from '../ui'
import { useSwipeToDelete } from '../navigation/use-swipe-to-delete'

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
  const swipe = useSwipeToDelete()

  function loadSearch(record: SavedSearchRecord) {
    swipe.handleClick(record.id, () => onLoad(record))
  }

  return (
    <aside aria-label="Saved searches" className="qar-react-nav-drawer-saved-searches">
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
            <li
              className={cn(
                'qar-react-nav-drawer-saved-searches-row',
                swipe.isOpen(record.id) && 'qar-react-nav-drawer-saved-searches-row--swiped',
              )}
              key={record.id}
            >
              <Button
                aria-label={`Load saved search ${record.intent.name}`}
                className="qar-react-nav-drawer-saved-searches-row-btn"
                onClick={() => loadSearch(record)}
                onPointerDown={(event) => swipe.pointerDown(event, record.id)}
                onPointerMove={(event) => swipe.pointerMove(event, record.id)}
                onPointerUp={(event) => swipe.pointerUp(event, record.id)}
                onTouchEnd={(event) => swipe.touchEnd(event, record.id)}
                onTouchMove={(event) => swipe.touchMove(event, record.id)}
                onTouchStart={(event) => swipe.touchStart(event, record.id)}
                style={swipe.rowStyle(record.id)}
                type="button"
                unstyled
              >
                <span className="qar-react-nav-drawer-saved-searches-copy" dir="auto">
                  <span className="qar-react-nav-drawer-saved-searches-name">
                    <bdi>{record.intent.name}</bdi>
                  </span>
                  <span className="qar-react-nav-drawer-saved-searches-query">
                    <bdi>{record.intent.queryText}</bdi>
                  </span>
                </span>
                <span className="qar-react-nav-drawer-saved-searches-chev" aria-hidden="true">
                  ›
                </span>
              </Button>
              <Button
                aria-label={`Delete saved search ${record.intent.name}`}
                className="qar-react-nav-drawer-saved-searches-row-del"
                onClick={() => {
                  swipe.closeSwipe()
                  onDelete(record.id)
                }}
                style={swipe.deleteStyle(record.id)}
                type="button"
                unstyled
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
