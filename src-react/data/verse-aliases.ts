import type { Riwayah } from '../storage/types'

export type VerseAlias = {
  hafs: number
  warsh: number | number[] | null
  qaloon: number | number[] | null
}

export type VerseAliases = Record<string, VerseAlias[]>

export type TranslationResolution =
  | { role: 'identity' | 'primary' | 'merged'; sourceKey: string; text: string }
  | { role: 'continuation'; sourceKey: string; primaryAyah?: number; text: null }
  | { role: 'none'; sourceKey: null; text: null }

export async function loadVerseAliases(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<{ aliases: VerseAliases }> {
  const response = await fetcher('/dataset/translations/_verse-aliases.json', { signal })
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
  const identityText = translations[identityKey]
  // Aliased surahs cannot trust the Hafs identity key: the mounted Arabic may
  // be Qaloon/Warsh while the translation pack remains Hafs-keyed.
  const surahAliases = aliases[String(surah)]
  if (!surahAliases || surahAliases.length === 0) {
    return identityText
      ? { role: 'identity', sourceKey: identityKey, text: identityText }
      : { role: 'none', sourceKey: null, text: null }
  }

  const matches = surahAliases
    .map((alias) => ({ alias, verses: getAliasVerses(alias, riwayah) }))
    .filter((entry) => entry.verses.includes(verse))

  if (matches.length === 0) {
    return { role: 'none', sourceKey: null, text: null }
  }

  if (matches.length > 1) {
    const sourceKey = matches.map((entry) => `${surah}:${entry.alias.hafs}`).join(',')
    const text = matches.map((entry) => translations[`${surah}:${entry.alias.hafs}`]).filter(Boolean).join(' ')
    return text ? { role: 'merged', sourceKey, text } : { role: 'none', sourceKey: null, text: null }
  }

  const matched = matches[0]!
  const sourceKey = `${surah}:${matched.alias.hafs}`
  const text = translations[sourceKey] ?? null
  if (matched.verses[0] !== verse) return { role: 'continuation', sourceKey, primaryAyah: matched.verses[0], text: null }
  if (!text) return { role: 'none', sourceKey: null, text: null }
  return { role: matched.verses.length > 1 ? 'primary' : 'identity', sourceKey, text }
}

export function getAliasVerses(alias: VerseAlias, riwayah: Riwayah): number[] {
  const value = alias[riwayah]
  if (value === null || value === undefined) return []
  return Array.isArray(value) ? value : [value]
}
