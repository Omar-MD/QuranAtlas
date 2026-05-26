import type { Riwayah } from '../storage/types'

export type VerseAlias = {
  hafs: number
  warsh: number | number[] | null
  qaloon: number | number[] | null
}

export type VerseAliases = Record<string, VerseAlias[]>

export type TranslationResolution =
  | { role: 'identity' | 'primary' | 'merged'; sourceKey: string; text: string }
  | { role: 'continuation'; sourceKey: string; text: null }
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
  if (riwayah === 'hafs' && translations[identityKey]) {
    return { role: 'identity', sourceKey: identityKey, text: translations[identityKey] }
  }
  const matches = (aliases[String(surah)] ?? [])
    .map((alias) => ({ alias, verses: getAliasVerses(alias, riwayah) }))
    .filter((entry) => entry.verses.includes(verse))

  if (matches.length === 0) {
    const text = translations[identityKey]
    return text ? { role: 'identity', sourceKey: identityKey, text } : { role: 'none', sourceKey: null, text: null }
  }

  if (matches.length > 1) {
    const sourceKey = matches.map((entry) => `${surah}:${entry.alias.hafs}`).join(',')
    const text = matches.map((entry) => translations[`${surah}:${entry.alias.hafs}`]).filter(Boolean).join(' ')
    return text ? { role: 'merged', sourceKey, text } : { role: 'none', sourceKey: null, text: null }
  }

  const matched = matches[0]!
  const sourceKey = `${surah}:${matched.alias.hafs}`
  const text = translations[sourceKey] ?? null
  if (matched.verses[0] !== verse) return { role: 'continuation', sourceKey, text: null }
  if (!text) return { role: 'none', sourceKey: null, text: null }
  return { role: matched.verses.length > 1 ? 'primary' : 'identity', sourceKey, text }
}

export function getAliasVerses(alias: VerseAlias, riwayah: Riwayah): number[] {
  const value = riwayah === 'hafs' ? alias.hafs : alias[riwayah]
  if (value === null || value === undefined) return []
  return Array.isArray(value) ? value : [value]
}
