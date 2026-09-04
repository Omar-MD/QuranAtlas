import { Button } from '../../ui'

export function BookmarkToggle({ active = false, onToggle }: { active?: boolean; onToggle?: () => void }) {
  return <Button aria-pressed={active} onClick={onToggle} size="sm" variant={active ? 'primary' : 'secondary'}>{active ? 'Bookmarked' : 'Bookmark'}</Button>
}
