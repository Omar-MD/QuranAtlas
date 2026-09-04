import type { SearchFeatureId } from '../../shared/search'
import { SearchPackReader } from '../search/pack-reader'
import type { SearchDecodedShard, SearchPackShardPayload } from '../search/schema'

type ResidentShard = SearchDecodedShard<SearchPackShardPayload> & {
  featureId: SearchFeatureId
  refCount: number
  lastUsedAt: number
}

export class SearchShardCache {
  private readonly resident = new Map<string, ResidentShard>()
  private readonly maxResidentBytes: number

  constructor(maxResidentBytes: number) {
    this.maxResidentBytes = maxResidentBytes
  }

  async load(reader: SearchPackReader, shardId: string): Promise<SearchDecodedShard<SearchPackShardPayload>> {
    const existing = this.resident.get(shardId)
    if (existing) {
      existing.refCount += 1
      existing.lastUsedAt = Date.now()
      return existing
    }
    const decoded = await reader.loadShard(shardId)
    const manifest = reader.manifest.shards.find((shard) => shard.shardId === shardId)
    const resident: ResidentShard = {
      ...decoded,
      featureId: manifest?.featureId ?? 'core',
      refCount: 1,
      lastUsedAt: Date.now(),
    }
    this.resident.set(shardId, resident)
    this.enforceBudget()
    return resident
  }

  release(shardId: string): void {
    const existing = this.resident.get(shardId)
    if (existing) existing.refCount = Math.max(0, existing.refCount - 1)
  }

  unloadFeature(featureId: SearchFeatureId): void {
    for (const [shardId, shard] of this.resident) {
      if (shard.featureId === featureId && shard.refCount === 0) this.resident.delete(shardId)
    }
  }

  totalResidentBytes(): number {
    let total = 0
    for (const shard of this.resident.values()) total += shard.estimatedMemoryBytes
    return total
  }

  dispose(): void {
    this.resident.clear()
  }

  private enforceBudget(): void {
    while (this.totalResidentBytes() > this.maxResidentBytes) {
      const evictable = [...this.resident.entries()]
        .filter(([, shard]) => shard.refCount === 0)
        .sort(([, left], [, right]) => left.lastUsedAt - right.lastUsedAt)[0]
      if (!evictable) break
      this.resident.delete(evictable[0])
    }
  }
}
