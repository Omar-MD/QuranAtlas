import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDB, get, openDB, put } from '../../../../src/core/db'
import { settings } from '../../../../src/configure/state.svelte'
import {
  advanceWirdFromReaderPosition,
  clearWirdPlan,
  loadWirdPlan,
  saveWirdPlan,
} from '../../../../src/read/wird/store'
import type { WirdPlan } from '../../../../src/read/wird/types'

vi.mock('../../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => [
    { n: 1, name: 'Al-Fatihah', name_ar: 'الفاتحة', counts: { hafs: 7, warsh: 7, qaloon: 7 } },
    { n: 2, name: 'Al-Baqarah', name_ar: 'البقرة', counts: { hafs: 286, warsh: 286, qaloon: 286 } },
  ]),
}))

const plan: WirdPlan = {
  id: 'wird-test',
  startRef: { surah: 2, verse: 1 },
  endRef: { surah: 2, verse: 20 },
  targetDays: 2,
  targetEndOn: '2026-05-05',
  startedOn: '2026-05-04',
  unit: 'verse',
  reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
  progress: {
    lastReadRef: { surah: 2, verse: 1 },
    nextRef: { surah: 2, verse: 1 },
    dayKey: '2026-05-04',
    todayStartRef: { surah: 2, verse: 1 },
    todayEndRef: { surah: 2, verse: 10 },
    completedThroughRef: null,
  },
  history: [],
}

describe('wird settings writer', () => {
  beforeEach(async () => {
    settings.wirdPlan = null
    try { await deleteDB() } catch { /* fresh */ }
    await openDB()
  })

  it('loads null when no plan exists', async () => {
    expect(await loadWirdPlan()).toBeNull()
    expect(settings.wirdPlan).toBeNull()
  })

  it('saves and clears the single active settings.wirdPlan record', async () => {
    await saveWirdPlan(plan)
    expect((await get('settings', 'wirdPlan'))?.value).toEqual(plan)
    expect(settings.wirdPlan).toEqual(plan)

    await clearWirdPlan()
    expect(await get('settings', 'wirdPlan')).toBeUndefined()
    expect(settings.wirdPlan).toBeNull()
  })

  it('repairs settings rune from an existing IDB record', async () => {
    await put('settings', { key: 'wirdPlan', value: plan })
    expect(await loadWirdPlan()).toEqual(plan)
    expect(settings.wirdPlan).toEqual(plan)
  })

  it('advances progress from reader position without rewinding', async () => {
    await saveWirdPlan(plan)
    await advanceWirdFromReaderPosition(2, 12)
    await advanceWirdFromReaderPosition(2, 4)

    const stored = (await get('settings', 'wirdPlan'))?.value as WirdPlan
    expect(stored.progress.completedThroughRef).toEqual({ surah: 2, verse: 12 })
    expect(stored.progress.nextRef).toEqual({ surah: 2, verse: 13 })
  })
})
