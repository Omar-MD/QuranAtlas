import { Badge } from '../../ui'

export function BookmarkIndicator({ active = false }: { active?: boolean }) {
  return active ? <Badge tone="success">Bookmark</Badge> : null
}
