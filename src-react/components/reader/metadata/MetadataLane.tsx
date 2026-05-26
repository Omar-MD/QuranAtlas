import type { VerseMetadata } from '../../../metadata/metadata-state'
import { Badge } from '../../ui'

export function MetadataLane({ metadata }: { metadata: VerseMetadata | null }) {
  if (!metadata || (metadata.themes.length === 0 && !metadata.passageSummary)) return null
  return (
    <aside className="qar:mt-3 qar:grid qar:gap-2 qar:border-l qar:border-border qar:pl-3 qar:text-sm qar:text-muted" aria-label="Verse metadata">
      {metadata.themes.length > 0 && (
        <div className="qar:flex qar:flex-wrap qar:gap-2">
          {metadata.themes.map((theme) => <Badge key={theme.id}>{theme.label}</Badge>)}
        </div>
      )}
      {metadata.passageSummary && <p className="qar:m-0">{metadata.passageSummary}</p>}
    </aside>
  )
}
