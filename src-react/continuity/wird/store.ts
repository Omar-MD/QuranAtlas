import type { QuranAtlasReactDb } from '../../storage/db'
import type { WirdPlan } from './types'

export async function readWirdPlan(db: QuranAtlasReactDb): Promise<WirdPlan | null> {
  const record = await db.settings.get('wirdPlan')
  return (record?.value as WirdPlan | null | undefined) ?? null
}

export async function writeWirdPlan(db: QuranAtlasReactDb, plan: WirdPlan | null): Promise<void> {
  await db.settings.put({ key: 'wirdPlan', value: plan })
}
