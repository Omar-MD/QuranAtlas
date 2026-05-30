import type { VerseMetadata } from '../../metadata/metadata-state'
import { MetadataLane } from './metadata/MetadataLane'

export function KnowledgeChips({ metadata }: { metadata: VerseMetadata | null }) {
  return <MetadataLane metadata={metadata} />
}
