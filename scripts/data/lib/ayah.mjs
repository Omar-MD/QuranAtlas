export function pad3(num) {
  return String(num).padStart(3, '0')
}

export function parseAyahKey(value) {
  const [surahRaw, ayahRaw, ...rest] = String(value).split(':')
  if (rest.length !== 0) {
    throw new Error(`Invalid ayah key "${value}"`)
  }
  const surah = Number(surahRaw)
  const ayah = Number(ayahRaw)
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || surah > 114 || ayah < 1) {
    throw new Error(`Invalid ayah key "${value}"`)
  }
  return { surah, ayah }
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
