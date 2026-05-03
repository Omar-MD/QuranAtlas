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

const PAD3 = (n) => String(n).padStart(3, '0')

export function normalizeQuranDbTranslation(source, options) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Quran DB translation source must be an object keyed by surah number')
  }
  if (!options?.id || !options?.field) {
    throw new Error('Quran DB translation normalization requires id and field')
  }

  const surahNumbers = Object.keys(source).map(Number).filter(Number.isInteger).sort((a, b) => a - b)
  const surahs = {}
  let totalVerses = 0

  for (const surahNo of surahNumbers) {
    const rawSurah = source[String(surahNo)]
    if (!rawSurah || typeof rawSurah !== 'object' || Array.isArray(rawSurah)) {
      throw new Error(`Quran DB surah ${surahNo} must be an object`)
    }
    const ayahs = rawSurah.Ayahs
    if (!ayahs || typeof ayahs !== 'object' || Array.isArray(ayahs)) {
      throw new Error(`Quran DB surah ${surahNo} missing Ayahs object`)
    }

    const ayahNumbers = Object.keys(ayahs).map(Number).filter(Number.isInteger).sort((a, b) => a - b)
    if (ayahNumbers.length === 0) {
      throw new Error(`Quran DB surah ${surahNo} has no ayahs`)
    }

    const verses = ayahNumbers.map((ayahNo, index) => {
      if (ayahNo !== index + 1) {
        throw new Error(`Quran DB surah ${surahNo} ayah keys must be contiguous from 1`)
      }
      const row = ayahs[String(ayahNo)]
      const text = row?.[options.field]
      if ((typeof text !== 'string' || !text.trim()) && options.allowMissingText !== true) {
        throw new Error(`Quran DB surah ${surahNo}:${ayahNo} missing ${options.field}`)
      }
      return {
        key: `${surahNo}:${ayahNo}`,
        text: typeof text === 'string' ? decodeHtmlEntities(text) : '',
      }
    })

    surahs[PAD3(surahNo)] = {
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
      surahs: surahNumbers.length,
      verses: totalVerses,
      footnotes: 0,
    },
    surahs,
  }
}
