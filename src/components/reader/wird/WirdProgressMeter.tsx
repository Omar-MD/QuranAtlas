import { Progress } from '../../ui'

export function WirdProgressMeter({ percent }: { percent: number }) {
  return <Progress label="Daily Wird progress" value={percent} />
}
