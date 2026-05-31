import { canonicalSurahKey, formatAyahKey, parseAyahKey } from '../../lib/ayah.mjs'

const HAFS_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98,
  135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75,
  85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29,
  19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9,
  5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]

const UA = 'QuranAtlas-fetch/1.0 (https://quranatlas.org)'
const FOOTNOTE_SUP_RE = /<sup\b[^>]*\bfoot_note\s*=\s*["']?(\d+)["']?[^>]*>.*?<\/sup>/gi

function decodeHtmlEntities(text) {
  return String(text)
    .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function cleanHtmlText(html) {
  return decodeHtmlEntities(html)
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function parseVerseKey(key) {
  const parsed = parseAyahKey(key, 'QUL translation row verse_key')
  return { surahNo: parsed.surah, ayahNo: parsed.ayah, key: parsed.key }
}

function collectFootnoteIds(text) {
  const ids = []
  for (const match of String(text).matchAll(FOOTNOTE_SUP_RE)) {
    ids.push(match[1])
  }
  return ids
}

function normalizeVerseText(text, footnotesById, surahFootnotes, upstreamToLocal) {
  return cleanHtmlText(String(text).replace(FOOTNOTE_SUP_RE, (_, upstreamId) => {
    const id = String(upstreamId)
    const body = footnotesById[id]
    if (!body) throw new Error(`QUL translation footnote ${id} missing body`)
    let local = upstreamToLocal.get(id)
    if (!local) {
      local = String(upstreamToLocal.size + 1)
      upstreamToLocal.set(id, local)
      surahFootnotes[local] = body
    }
    return `[${local}]`
  }))
}

export function normalizeQulTranslationRows(rows, options) {
  if (!Array.isArray(rows)) {
    throw new Error('QUL translation normalization requires an array of translation rows')
  }
  if (!options?.id) {
    throw new Error('QUL translation normalization requires id')
  }

  const sortedRows = [...rows].sort((a, b) => {
    const av = parseVerseKey(a?.verse_key)
    const bv = parseVerseKey(b?.verse_key)
    return av.surahNo - bv.surahNo || av.ayahNo - bv.ayahNo
  })

  const grouped = new Map()
  for (const row of sortedRows) {
    const { surahNo, ayahNo } = parseVerseKey(row?.verse_key)
    if (!grouped.has(surahNo)) {
      grouped.set(surahNo, [])
    }
    grouped.get(surahNo).push({ ayahNo, row })
  }

  const surahs = {}
  let totalVerses = 0
  let totalFootnotes = 0
  for (const [surahNo, entries] of grouped) {
    const footnotes = {}
    const upstreamToLocal = new Map()
    const verses = entries.map(({ ayahNo, row }, index) => {
      if (ayahNo !== index + 1) {
        throw new Error(`QUL translation surah ${surahNo} ayah keys must be contiguous from 1`)
      }
      return {
        key: formatAyahKey(surahNo, ayahNo),
        text: normalizeVerseText(row.text ?? '', options.footnotesById ?? {}, footnotes, upstreamToLocal),
      }
    })
    surahs[canonicalSurahKey(surahNo)] = { intro: [], verses, footnotes }
    totalVerses += verses.length
    totalFootnotes += Object.keys(footnotes).length
  }

  return {
    translationId: options.id,
    translationVersion: options.translationVersion,
    fetchedAt: options.fetchedAt ?? new Date().toISOString(),
    source: {
      provider: 'Quranic Universal Library',
      name: options.label,
      author: options.author,
      language: options.language ?? 'en',
      sourceUrl: options.sourceUrl,
      resourceId: options.resourceId,
      contentResourceId: options.contentResourceId,
    },
    counts: {
      surahs: grouped.size,
      verses: totalVerses,
      footnotes: totalFootnotes,
    },
    surahs,
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

function extractFootnoteBody(html, id) {
  const bodyMatch = /<div id="body">([\s\S]*?)<\/div>\s*<\/div>\s*$/i.exec(String(html).trim())
  const body = bodyMatch ? bodyMatch[1] : html
  const text = cleanHtmlText(body)
  if (!text) throw new Error(`QUL footnote ${id} returned an empty body`)
  return text
}

async function fetchFootnotes(ids, concurrency = 8) {
  const unique = [...new Set(ids.map(String))]
  const footnotes = {}
  let cursor = 0

  async function worker() {
    while (cursor < unique.length) {
      const id = unique[cursor++]
      const html = await fetchText(`https://qul.tarteel.ai/foot_notes/${id}`)
      footnotes[id] = extractFootnoteBody(html, id)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker))
  return footnotes
}

export async function fetchQulTranslationSource(fetchConfig) {
  const apiBase = `https://qul.tarteel.ai/api/v1/translations/${fetchConfig.contentResourceId}/by_range.json`
  const rows = []
  for (let surahNo = 1; surahNo <= 114; surahNo++) {
    const params = new URLSearchParams({
      from: `${surahNo}:1`,
      to: `${surahNo}:${HAFS_COUNTS[surahNo - 1]}`,
      per_page: '300',
    })
    const json = await fetchJson(`${apiBase}?${params}`)
    if (!Array.isArray(json.translations)) {
      throw new Error(`QUL translation response missing translations array for surah ${surahNo}`)
    }
    rows.push(...json.translations)
  }

  const footnoteIds = rows.flatMap((row) => collectFootnoteIds(row.text ?? ''))
  return {
    rows,
    footnotesById: await fetchFootnotes(footnoteIds, fetchConfig.footnoteConcurrency ?? 8),
  }
}
