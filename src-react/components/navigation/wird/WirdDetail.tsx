import type { SurahCount, WirdPlan } from '../../../continuity/wird/types'
import { DailyWirdCard } from '../../reader/wird/DailyWirdCard'

export function WirdDetail({ counts, plan }: { counts: SurahCount[]; plan: WirdPlan | null }) {
  return <DailyWirdCard counts={counts} plan={plan} />
}
