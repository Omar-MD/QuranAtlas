import { HAFS_AYAH_COUNTS, canonicalSurahKey, formatAyahKey, parseAyahKey } from '../../lib/ayah.mjs'
import { decodeHtmlEntities } from '../../lib/html-entities.mjs'
import { fetchJson, fetchText } from '../../lib/fetch.mjs'

const FOOTNOTE_SUP_RE = /<sup\b[^>]*\bfoot_note\s*=\s*["']?(\d+)["']?[^>]*>.*?<\/sup>/gi

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
  return cleanHtmlText(
    String(text).replace(FOOTNOTE_SUP_RE, (_, upstreamId) => {
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
    }),
  )
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
      to: `${surahNo}:${HAFS_AYAH_COUNTS[surahNo - 1]}`,
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
