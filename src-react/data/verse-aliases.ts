import type { Riwayah } from '../storage/types'

export type VerseAlias = {
  hafs: number
  warsh: number[]
  qaloon: number[]
}

export type VerseAliases = Record<string, VerseAlias[]>

export type TranslationResolution =
  | { role: 'identity' | 'primary' | 'merged'; sourceKey: string; text: string }
  | { role: 'continuation'; sourceKey: string; text: null }
  | { role: 'none'; sourceKey: null; text: null }

export async function loadVerseAliases(fetcher: typeof fetch = fetch): Promise<{ aliases: VerseAliases }> {
  const response = await fetcher('/dataset/translations/_verse-aliases.json')
  if (!response.ok) return { aliases: {} }
  return response.json() as Promise<{ aliases: VerseAliases }>
}

export function resolveTranslationFor({
  aliases,
  riwayah,
  surah,
  translations,
  verse,
}: {
  aliases: VerseAliases
  riwayah: Riwayah
  surah: number
  translations: Record<string, string>
  verse: number
}): TranslationResolution {
  const identityKey = `${surah}:${verse}`
  if (riwayah === 'hafs' && translations[identityKey]) {
    return { role: 'identity', sourceKey: identityKey, text: translations[identityKey] }
  }
  const matched = aliases[String(surah)]?.find((alias) => getAliasVerses(alias, riwayah).includes(verse))
  if (!matched) {
    const text = translations[identityKey]
    return text ? { role: 'identity', sourceKey: identityKey, text } : { role: 'none', sourceKey: null, text: null }
  }
  const sourceKey = `${surah}:${matched.hafs}`
  const text = translations[sourceKey] ?? null
  const activeVerses = getAliasVerses(matched, riwayah)
  if (activeVerses[0] !== verse) return { role: 'continuation', sourceKey, text: null }
  if (!text) return { role: 'none', sourceKey: null, text: null }
  return { role: activeVerses.length > 1 ? 'primary' : 'identity', sourceKey, text }
}

export function getAliasVerses(alias: VerseAlias, riwayah: Riwayah): number[] {
  return riwayah === 'hafs' ? [alias.hafs] : alias[riwayah]
}
