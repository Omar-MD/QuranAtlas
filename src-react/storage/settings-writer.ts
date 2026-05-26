import type { QuranAtlasReactDb } from './db'
import type { Riwayah, SettingRecord } from './types'

export type ReaderAssetBundleSettings = {
  riwayah: Riwayah
  quranTextStyleId: string
  mushafEditionId: string
}

export type OnboardingCompletionSettings = {
  riwayah: Riwayah
  translationId: string
}

export async function writeReaderAssetBundleSettings(db: QuranAtlasReactDb, settings: ReaderAssetBundleSettings): Promise<void> {
  const records: SettingRecord[] = [
    { key: 'riwayah', value: settings.riwayah },
    { key: 'quranTextStyleId', value: settings.quranTextStyleId },
    { key: 'mushafEditionId', value: settings.mushafEditionId },
  ]
  await db.transaction('rw', db.settings, async () => {
    await db.settings.bulkPut(records)
  })
}

export async function writeOnboardingCompletion(db: QuranAtlasReactDb, settings: OnboardingCompletionSettings): Promise<void> {
  const records: SettingRecord[] = [
    { key: 'onboardingComplete', value: true },
    { key: 'riwayah', value: settings.riwayah },
    { key: 'translationId', value: settings.translationId },
  ]
  await db.transaction('rw', db.settings, async () => {
    await db.settings.bulkPut(records)
  })
}
