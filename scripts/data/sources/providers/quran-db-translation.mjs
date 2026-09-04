import { canonicalSurahKey, formatAyahKey, parseAyahKey } from '../../lib/ayah.mjs'

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeQuranDbTranslation(source, options) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Quran DB translation source must be an object keyed by surah number')
  }
  if (!options?.id || !options?.field) {
    throw new Error('Quran DB translation normalization requires id and field')
  }

  const surahEntries = canonicalizeQuranDbSurahs(source)
  const surahs = {}
  let totalVerses = 0

  for (const { surahNo, surahKey, rawSurah } of surahEntries) {
    if (!rawSurah || typeof rawSurah !== 'object' || Array.isArray(rawSurah)) {
      throw new Error(`Quran DB surah ${surahNo} must be an object`)
    }
    const ayahs = rawSurah.Ayahs
    if (!ayahs || typeof ayahs !== 'object' || Array.isArray(ayahs)) {
      throw new Error(`Quran DB surah ${surahNo} missing Ayahs object`)
    }

    const ayahEntries = canonicalizeQuranDbAyahs(surahNo, ayahs)
    if (ayahEntries.length === 0) {
      throw new Error(`Quran DB surah ${surahNo} has no ayahs`)
    }

    const verses = ayahEntries.map(({ ayahNo, row }, index) => {
      if (ayahNo !== index + 1) {
        throw new Error(`Quran DB surah ${surahNo} ayah keys must be contiguous from 1`)
      }
      const text = row?.[options.field]
      if ((typeof text !== 'string' || !text.trim()) && options.allowMissingText !== true) {
        throw new Error(`Quran DB surah ${surahNo}:${ayahNo} missing ${options.field}`)
      }
      return {
        key: formatAyahKey(surahNo, ayahNo),
        text: typeof text === 'string' ? decodeHtmlEntities(text) : '',
      }
    })

    surahs[surahKey] = {
      intro: [],
      verses,
      footnotes: {},
      source: {
        transliteratedName: rawSurah.SurahTransliteratedName ?? '',
        arabicName: rawSurah.SurahArabicName ?? '',
        englishNames: rawSurah.SurahEnglishNames ?? '',
      },
    }
    totalVerses += verses.length
  }

  return {
    translationId: options.id,
    translationVersion: options.translationVersion,
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    source: {
      provider: 'quran_db',
      name: options.field,
      author: options.author ?? options.label,
      language: options.language ?? 'en',
      sourceUrl: options.sourceUrl,
    },
    counts: {
      surahs: surahEntries.length,
      verses: totalVerses,
      footnotes: 0,
    },
    surahs,
  }
}

function canonicalizeQuranDbSurahs(source) {
  const entries = []
  const seen = new Map()
  for (const [rawKey, rawSurah] of Object.entries(source)) {
    const surahKey = canonicalSurahKey(rawKey, `Quran DB surah key ${rawKey}`)
    const previousRawKey = seen.get(surahKey)
    if (previousRawKey !== undefined) {
      throw new Error(`Quran DB duplicate surah key ${rawKey}; ${previousRawKey} also canonicalizes to ${surahKey}`)
    }
    seen.set(surahKey, rawKey)
    entries.push({ surahNo: Number(surahKey), surahKey, rawSurah })
  }
  return entries.sort((a, b) => a.surahNo - b.surahNo)
}

function canonicalizeQuranDbAyahs(surahNo, ayahs) {
  const entries = []
  const seen = new Map()
  for (const [rawKey, row] of Object.entries(ayahs)) {
    const parsed = parseAyahKey({ surah: surahNo, ayah: rawKey }, `Quran DB surah ${surahNo} ayah key ${rawKey}`)
    const ref = parsed.key
    const previousRawKey = seen.get(ref)
    if (previousRawKey !== undefined) {
      throw new Error(`Quran DB duplicate ayah key ${rawKey}; ${previousRawKey} also canonicalizes to ${ref}`)
    }
    seen.set(ref, rawKey)
    entries.push({ ayahNo: parsed.ayah, row })
  }
  return entries.sort((a, b) => a.ayahNo - b.ayahNo)
}
