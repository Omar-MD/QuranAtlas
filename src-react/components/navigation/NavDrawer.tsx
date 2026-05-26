import { Button, SegmentedControl } from '../ui'
import { BookmarksList } from './BookmarksList'
import { JuzList } from './JuzList'
import { SurahList } from './SurahList'
import { DailyWirdCard } from '../reader/wird/DailyWirdCard'

export function NavDrawer({
  currentLabel,
  mode,
  onClose,
  onNavigate,
  open,
}: {
  currentLabel: string
  mode: 'verse' | 'mushaf'
  onClose: () => void
  onNavigate: (hash: string) => void
  open: boolean
}) {
  if (!open) return null
  return (
    <aside className="qar:grid qar:w-full qar:max-w-md qar:gap-4 qar:border-r qar:border-border qar:bg-surface qar:p-4" aria-label="Navigation drawer">
      <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
        <div>
          <p className="qar:m-0 qar:text-xs qar:text-muted">Browse</p>
          <h2 className="qar:m-0 qar:text-xl qar:leading-tight">{currentLabel}</h2>
        </div>
        <Button onClick={onClose} size="sm" variant="ghost">Close</Button>
      </div>
      <SegmentedControl
        label="Reader mode"
        onValueChange={(value) => onNavigate(value === 'verse' ? '#/s/1' : '#/m/1')}
        options={[{ label: 'Verse', value: 'verse' }, { label: 'Mushaf', value: 'mushaf' }]}
        value={mode}
      />
      <DailyWirdCard counts={[{ n: 1, count: 7 }]} plan={null} />
      {mode === 'verse' && (
        <div className="qar:grid qar:gap-3">
          <div className="qar:flex qar:flex-wrap qar:gap-2">
            <Button onClick={() => onNavigate('#/surahs')} size="sm" variant="secondary">Surah</Button>
            <Button onClick={() => onNavigate('#/surahs')} size="sm" variant="secondary">Juz</Button>
            <Button onClick={() => onNavigate('#/bookmarks')} size="sm" variant="secondary">Bookmarks</Button>
          </div>
          <SurahList onNavigate={onNavigate} />
          <JuzList onNavigate={onNavigate} />
          <BookmarksList onNavigate={onNavigate} />
        </div>
      )}
    </aside>
  )
}
