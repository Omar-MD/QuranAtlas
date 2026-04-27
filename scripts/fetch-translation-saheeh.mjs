#!/usr/bin/env node
/**
 * One-shot fetch script for Saheeh International translation (Quran.com qdc id 20).
 *
 * Pulls all 114 surahs + footnotes from api.qurancdn.com, normalises markup
 * into clean text + numbered footnote markers, writes the monolithic source
 * file consumed by the build pipeline:
 *
 *   public/dataset/translations/saheeh.raw.json
 *
 * Run via: node scripts/fetch-translation-saheeh.mjs
 *
 * The output is committed to git so subsequent builds run offline.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const OUT_PATH = join(REPO_ROOT, 'public', 'dataset', 'translations', 'saheeh.raw.json')

const TRANSLATION_ID = 20
const API_BASE = 'https://api.qurancdn.com/api/qdc'
const UA = 'QuranAtlas-fetch/1.0 (https://quranatlas.org)'

const SUP_RE = /<sup\s+foot_note=(?:"?(\d+)"?)[^>]*>(\d+)<\/sup>/g
const HTML_TAG_RE = /<[^>]+>/g
const PAD3 = (n) => String(n).padStart(3, '0')

async function getJSON(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`)
      }
      return await res.json()
    } catch (e) {
      if (attempt === retries - 1) { throw e }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

async function fetchSurah(surahNo) {
  const url = `${API_BASE}/verses/by_chapter/${surahNo}?language=en&words=false&translations=${TRANSLATION_ID}&per_page=300&page=1`
  const data = await getJSON(url)
  if (!Array.isArray(data?.verses)) {
    throw new Error(`bad payload for surah ${surahNo}`)
  }
  if (data.pagination?.total_pages !== 1) {
    throw new Error(`unexpected pagination for surah ${surahNo}: total_pages=${data.pagination?.total_pages}`)
  }
  return data.verses
}

async function fetchFootnote(id, cache) {
  if (cache.has(id)) { return cache.get(id) }
  const url = `${API_BASE}/foot_notes/${id}`
  const data = await getJSON(url)
  const text = data?.foot_note?.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`missing footnote text for id ${id}`)
  }
  // Some footnote bodies wrap content in HTML tags — strip but preserve text.
  const stripped = text.replace(HTML_TAG_RE, '').trim()
  cache.set(id, stripped)
  return stripped
}

/**
 * Walk verse text, collect footnote source IDs in order of appearance,
 * renumber 1..K within the surah, and rewrite markers as `[N]`.
 */
function normaliseVerseText(rawText, surahFootnoteCounter, surahFootnoteOrder) {
  SUP_RE.lastIndex = 0
  let result = ''
  let lastIndex = 0
  let m
  while ((m = SUP_RE.exec(rawText))) {
    result += rawText.slice(lastIndex, m.index)
    const sourceId = parseInt(m[1], 10)
    let perSurahIdx = surahFootnoteOrder.get(sourceId)
    if (!perSurahIdx) {
      perSurahIdx = ++surahFootnoteCounter.value
      surahFootnoteOrder.set(sourceId, perSurahIdx)
    }
    result += `[${perSurahIdx}]`
    lastIndex = m.index + m[0].length
  }
  result += rawText.slice(lastIndex)
  if (HTML_TAG_RE.test(result)) {
    HTML_TAG_RE.lastIndex = 0
    result = result.replace(HTML_TAG_RE, '')
  }
  return result.trim()
}

async function main() {
  console.log('[fetch-saheeh] starting')
  const fnCache = new Map()
  const surahs = {}
  let totalVerses = 0
  let totalFootnotes = 0

  for (let n = 1; n <= 114; n++) {
    const verses = await fetchSurah(n)
    if (!verses.length) {
      throw new Error(`empty verses for surah ${n}`)
    }

    const surahFootnoteCounter = { value: 0 }
    const surahFootnoteOrder = new Map()
    const outVerses = []
    for (const v of verses) {
      const tr = v?.translations?.[0]
      if (!tr || typeof tr.text !== 'string') {
        throw new Error(`missing translation for ${v?.verse_key}`)
      }
      const cleanedText = normaliseVerseText(tr.text, surahFootnoteCounter, surahFootnoteOrder)
      outVerses.push({ key: v.verse_key, text: cleanedText })
    }

    const idsForSurah = Array.from(surahFootnoteOrder.entries())
    idsForSurah.sort((a, b) => a[1] - b[1])
    const footnotes = {}
    for (let i = 0; i < idsForSurah.length; i += 4) {
      const slice = idsForSurah.slice(i, i + 4)
      const texts = await Promise.all(slice.map(([id]) => fetchFootnote(id, fnCache)))
      for (let k = 0; k < slice.length; k++) {
        const [, perSurahIdx] = slice[k]
        footnotes[String(perSurahIdx)] = texts[k]
      }
    }

    surahs[PAD3(n)] = {
      intro: [],
      verses: outVerses,
      footnotes,
    }
    totalVerses += outVerses.length
    totalFootnotes += Object.keys(footnotes).length
    process.stdout.write(`[fetch-saheeh] surah ${n}/114 (${outVerses.length} verses, ${Object.keys(footnotes).length} footnotes)\r`)
  }

  if (totalVerses !== 6236) {
    throw new Error(`total verse count ${totalVerses}, expected 6236 (Hafs)`)
  }

  const out = {
    translationId: 'saheeh',
    translationVersion: '20.2026-04',
    fetchedAt: new Date().toISOString(),
    source: {
      api: API_BASE,
      translationId: TRANSLATION_ID,
      name: 'Saheeh International',
      author: 'Saheeh International',
      language: 'en',
      license: 'Free for non-commercial distribution (Saheeh International Foundation)',
      sourceUrl: `${API_BASE}/quran/translations/${TRANSLATION_ID}`,
    },
    counts: {
      surahs: 114,
      verses: totalVerses,
      footnotes: totalFootnotes,
    },
    surahs,
  }

  await mkdir(dirname(OUT_PATH), { recursive: true })
  await writeFile(OUT_PATH, JSON.stringify(out, null, 0), 'utf8')
  console.log(`\n[fetch-saheeh] wrote ${OUT_PATH}`)
  console.log(`[fetch-saheeh] surahs=114 verses=${totalVerses} footnotes=${totalFootnotes} unique-footnote-ids=${fnCache.size}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
