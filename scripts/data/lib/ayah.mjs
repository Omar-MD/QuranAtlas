export const HAFS_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98,
  135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75,
  85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29,
  19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9,
  5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]

export function pad3(num) {
  return canonicalSurahKey(num)
}

function describeValue(value) {
  return typeof value === 'string' ? value : String(value)
}

function invalidKeyError(kind, value, context) {
  const message = `Invalid ${kind} "${describeValue(value)}"`
  return new Error(context ? `${context}: ${message}` : message)
}

function parsePositiveIntegerKey(value, kind, context) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 1) {
      throw invalidKeyError(kind, value, context)
    }
    return value
  }
  const raw = String(value).trim()
  if (!/^\d+$/.test(raw)) {
    throw invalidKeyError(kind, value, context)
  }
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw invalidKeyError(kind, value, context)
  }
  return parsed
}

export function parseSurahKey(value, context) {
  const surah = parsePositiveIntegerKey(value, 'surah key', context)
  if (surah > 114) {
    throw invalidKeyError('surah key', value, context)
  }
  return surah
}

export function canonicalSurahKey(value, context) {
  return String(parseSurahKey(value, context)).padStart(3, '0')
}

export function formatAyahKey(surah, ayah, context) {
  const surahNo = parseSurahKey(surah, context ? `${context} surah` : undefined)
  const ayahNo = parsePositiveIntegerKey(ayah, 'ayah key', context ? `${context} ayah` : undefined)
  return `${surahNo}:${ayahNo}`
}

export function canonicalAyahKey(value, context) {
  return parseAyahKey(value, context).key
}

export function parseAyahKey(value, context) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const surahValue = value.surah ?? value.surahNo ?? value.suraNo ?? value.sura ?? value.sora
    const ayahValue = value.ayah ?? value.ayahNo ?? value.ayaNo ?? value.aya ?? value.aya_no
    const key = formatAyahKey(surahValue, ayahValue, context)
    const [surahRaw, ayahRaw] = key.split(':')
    const surah = Number(surahRaw)
    const ayah = Number(ayahRaw)
    return { surah, ayah, key, surahKey: canonicalSurahKey(surah) }
  }
  const raw = String(value).trim()
  const match = /^(\d+):(\d+)$/.exec(raw)
  if (!match) {
    throw invalidKeyError('ayah key', value, context)
  }
  const surah = Number(match[1])
  const ayah = Number(match[2])
  if (!Number.isSafeInteger(surah) || !Number.isSafeInteger(ayah) || surah < 1 || surah > 114 || ayah < 1) {
    throw invalidKeyError('ayah key', value, context)
  }
  const key = `${surah}:${ayah}`
  return { surah, ayah, key, surahKey: canonicalSurahKey(surah) }
}

export function compareAyahKeys(a, b) {
  const pa = parseAyahKey(a)
  const pb = parseAyahKey(b)
  return pa.surah - pb.surah || pa.ayah - pb.ayah
}

export function assertAyahExists(ayahKey, surahAyahCounts, context) {
  const { surah, ayah } = parseAyahKey(ayahKey)
  const maxAyah = surahAyahCounts[surah - 1]
  if (!Number.isInteger(maxAyah) || maxAyah <= 0) {
    throw new Error(`${context}: missing ayah count metadata for surah ${surah}`)
  }
  if (ayah > maxAyah) {
    throw new Error(`${context}: ayah key "${ayahKey}" exceeds surah ${surah} ayah count (${maxAyah})`)
  }
  return { surah, ayah }
}

export function expectedHafsAyahKeys() {
  const keys = []
  for (let surah = 1; surah <= 114; surah += 1) {
    for (let ayah = 1; ayah <= HAFS_AYAH_COUNTS[surah - 1]; ayah += 1) {
      keys.push(formatAyahKey(surah, ayah))
    }
  }
  return keys
}

export function assertCompleteHafsAyahCoverage(refs, context) {
  const seen = new Set()
  const extras = []
  for (const ref of refs) {
    const canonical = canonicalAyahKey(ref, context)
    const { surah, ayah } = parseAyahKey(canonical)
    const maxAyah = HAFS_AYAH_COUNTS[surah - 1]
    if (!Number.isInteger(maxAyah) || ayah > maxAyah) {
      extras.push(canonical)
    }
    seen.add(canonical)
  }

  const missing = expectedHafsAyahKeys().filter((ref) => !seen.has(ref))
  if (missing.length > 0 || extras.length > 0) {
    throw new Error(
      `${context}: Hafs ayah coverage mismatch; `
      + `missing ${missing.length}${missing.length ? ` (${missing.slice(0, 8).join(', ')})` : ''}; `
      + `out-of-range ${extras.length}${extras.length ? ` (${extras.slice(0, 8).join(', ')})` : ''}`,
    )
  }
  return { ayahs: seen.size, surahs: 114 }
}
