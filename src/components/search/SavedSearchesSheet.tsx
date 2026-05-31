import type { SavedSearchRecord } from '../../storage/types'
import { Button, Sheet } from '../ui'
import { SavedSearchesRail } from './SavedSearchesRail'

export function SavedSearchesSheet({
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
    <Sheet title="Saved searches" trigger={<Button type="button" variant="secondary">Saved searches</Button>}>
      <SavedSearchesRail onDelete={onDelete} onLoad={onLoad} onRename={onRename} records={records} />
    </Sheet>
  )
}
