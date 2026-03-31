#!/usr/bin/env node
/**
 * QuranAtlas Dataset Build Pipeline
 *
 * Produces the complete dataset package in public/dataset/:
 *   - surah/001.json … surah/114.json  {"ar":[...],"en":[...]}
 *   - surahs.json      surah metadata (114 records)
 *   - juz.json         juz boundaries (30 records)
 *   - annotations.json sajda markers, basmala rules, closing dua
 *   - provenance.json  license and attribution
 *   - manifest.json    SHA-256 hashes of all files + package version
 *
 * Sources:
 *   PRIMARY:  quran.com API v4
 *   FALLBACK: github.com/quran/quran-json (pre-built JSON)
 *
 * Usage:
 *   node scripts/build-dataset.js
 *   QURAN_API_BASE=https://api.quran.com/api/v4 node scripts/build-dataset.js
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Configuration ────────────────────────────────────────────────────────────

const API_BASE = process.env.QURAN_API_BASE ?? 'https://api.quran.com/api/v4';
const BRIDGES_TRANSLATION_ID = 149; // Bridges' translation — Fadel Soliman
const OUTPUT_DIR = join(process.cwd(), 'public', 'dataset');
const PACKAGE_VERSION = '1.0.0';

// Fetch resilience
const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;
const CONCURRENCY = Number(process.env.QURAN_CONCURRENCY ?? 6);

// Fallback: raw quran-json GitHub files
const QURAN_JSON_BASE =
  'https://raw.githubusercontent.com/quran/quran-json/master/data/editions/quran-uthmani.json';

// Known verse counts per surah (used for verification)
const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112,
  78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37,
  35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8,
  8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const TOTAL_AYAHS = SURAH_VERSE_COUNTS.reduce((a, b) => a + b, 0); // 6236

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJson(url, description) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(INITIAL_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
      const jittered = Math.round(backoff * (0.5 + Math.random() * 0.5));
      console.log(`    Retry ${attempt}/${MAX_RETRIES} for ${description} in ${jittered}ms...`);
      await sleep(jittered);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter && Number(retryAfter) > 0
          ? Number(retryAfter) * 1000
          : Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
        lastError = new Error(`HTTP 429 rate-limited fetching ${description}`);
        console.warn(`    Rate-limited on ${description}, waiting ${Math.round(waitMs)}ms...`);
        await sleep(waitMs);
        continue;
      }

      if (res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} fetching ${description}: ${url}`);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${description}: ${url}`);
      }

      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error(`Timeout (${FETCH_TIMEOUT_MS}ms) fetching ${description}: ${url}`);
      } else if (err.message?.startsWith('HTTP')) {
        throw err;
      } else {
        lastError = err;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

async function sha256File(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function surahNumber(n) {
  return String(n).padStart(3, '0');
}

async function runWithConcurrency(taskFns, concurrency, label) {
  const results = new Array(taskFns.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < taskFns.length) {
      const i = nextIndex++;
      results[i] = await taskFns[i]();
      completed++;
      process.stdout.write(`\r  ${label}: ${completed}/${taskFns.length}`);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, taskFns.length) },
    () => worker(),
  );
  await Promise.all(workers);
  console.log();
  return results;
}

// ─── quran.com API Fetchers ───────────────────────────────────────────────────

async function fetchUthmaniArabicFromApi(surahNum) {
  const url = `${API_BASE}/quran/verses/uthmani?chapter_number=${surahNum}`;
  const data = await fetchJson(url, `Arabic surah ${surahNum}`);
  return data.verses.map((v) => v.text_uthmani);
}

function stripHtml(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchTranslationFromApi(surahNum) {
  const url = `${API_BASE}/quran/translations/${BRIDGES_TRANSLATION_ID}?chapter_number=${surahNum}`;
  const data = await fetchJson(url, `Translation surah ${surahNum}`);
  return data.translations.map((v) => stripHtml(v.text));
}

async function fetchSurahMetaFromApi() {
  const data = await fetchJson(`${API_BASE}/chapters?language=en`, 'surah metadata');
  return data.chapters.map((c) => ({
    n: c.id,
    name: c.name_simple,
    arabic: c.name_arabic,
    type: c.revelation_place === 'makkah' ? 'Meccan' : 'Medinan',
    count: c.verses_count,
    juz: null, // filled separately
  }));
}

async function fetchJuzFromApi() {
  const data = await fetchJson(`${API_BASE}/juzs`, 'juz data');
  const seen = new Set();
  return data.juzs
    .map((j) => {
      const firstSurah = Object.keys(j.verse_mapping)[0];
      const ayah = parseInt(j.verse_mapping[firstSurah].split('-')[0], 10);
      return { j: j.juz_number, s: parseInt(firstSurah, 10), a: ayah };
    })
    .filter(({ j }) => {
      if (seen.has(j)) return false;
      seen.add(j);
      return true;
    });
}

// ─── quran-json GitHub Fallback ───────────────────────────────────────────────

async function fetchFromGitHubFallback() {
  console.log('  Using quran-json GitHub fallback...');
  const data = await fetchJson(QURAN_JSON_BASE, 'quran-json full corpus');

  // quran-json format: array of surahs, each with array of verses {id, verse, text}
  return data.map((surah) => surah.verses.map((v) => v.text));
}

// ─── Build Steps ─────────────────────────────────────────────────────────────

async function buildSurahFiles(arabicBySurah, translationBySurah) {
  const surahDir = join(OUTPUT_DIR, 'surah');
  await mkdir(surahDir, { recursive: true });

  let totalAyahs = 0;

  for (let i = 0; i < 114; i++) {
    const surahNum = i + 1;
    const ar = arabicBySurah[i];
    const en = translationBySurah[i];

    if (ar.length !== SURAH_VERSE_COUNTS[i]) {
      throw new Error(
        `Surah ${surahNum}: expected ${SURAH_VERSE_COUNTS[i]} Arabic verses, got ${ar.length}`,
      );
    }
    if (en.length !== SURAH_VERSE_COUNTS[i]) {
      throw new Error(
        `Surah ${surahNum}: expected ${SURAH_VERSE_COUNTS[i]} translation verses, got ${en.length}`,
      );
    }

    const filePath = join(surahDir, `${surahNumber(surahNum)}.json`);
    await writeFile(filePath, JSON.stringify({ ar, en }), 'utf8');
    totalAyahs += ar.length;
    process.stdout.write(`\r  Surah ${surahNum}/114 written (${totalAyahs} ayahs total)`);
  }

  console.log(); // newline after progress

  if (totalAyahs !== TOTAL_AYAHS) {
    throw new Error(`Ayah count mismatch: expected ${TOTAL_AYAHS}, got ${totalAyahs}`);
  }

  console.log(`  ✓ ${totalAyahs} ayahs verified across 114 surahs`);
}

async function buildMetadataFiles(surahMeta, juzData) {
  // Populate the juz field: surah S belongs to the highest-numbered juz that starts at or before S:1.
  // juzData is sorted by j ascending; iterate in reverse to find the last juz entry whose start ≤ S.
  const sortedJuz = [...juzData].sort((a, b) => a.j - b.j);
  for (const surah of surahMeta) {
    let juzNum = 1;
    for (const { j, s, a } of sortedJuz) {
      if (s < surah.n || (s === surah.n && a === 1)) juzNum = j;
    }
    surah.juz = juzNum;
  }

  await writeFile(join(OUTPUT_DIR, 'surahs.json'), JSON.stringify(surahMeta), 'utf8');
  await writeFile(join(OUTPUT_DIR, 'juz.json'), JSON.stringify(juzData), 'utf8');

  const annotations = {
    basmala: {
      counted: [1], // Surah 1: basmala is verse 1:1
      prefix: Array.from({ length: 113 }, (_, i) => i + 2).filter((n) => n !== 9), // surahs 2-114 except 9
      none: [9], // Surah 9: no basmala
      inline: [{ surah: 27, ayah: 30 }], // 27:30 contains bismillah as regular verse text
    },
    sajda: [
      { surah: 7, ayah: 206 },
      { surah: 13, ayah: 15 },
      { surah: 16, ayah: 50 },
      { surah: 17, ayah: 109 },
      { surah: 19, ayah: 58 },
      { surah: 22, ayah: 18 },
      { surah: 22, ayah: 77 },
      { surah: 25, ayah: 60 },
      { surah: 27, ayah: 26 },
      { surah: 32, ayah: 15 },
      { surah: 38, ayah: 24 },
      { surah: 41, ayah: 38 },
      { surah: 53, ayah: 62 },
      { surah: 84, ayah: 21 },
      { surah: 96, ayah: 19 },
    ],
    closingDua: {
      arabic: 'صَدَقَ ٱللَّهُ ٱلْعَظِيمُ',
      english: 'Allah the Almighty has spoken the truth.',
      note: 'Non-canonical reader tradition; not a Quranic verse.',
    },
  };

  await writeFile(join(OUTPUT_DIR, 'annotations.json'), JSON.stringify(annotations), 'utf8');

  const provenance = {
    packageVersion: PACKAGE_VERSION,
    builtAt: new Date().toISOString(),
    corpus: {
      name: 'Uthmani Quran Text (PUA-encoded)',
      source: 'quran.com / Quran Foundation',
      license: 'Redistribution confirmed',
      notes: 'PUA-encoded codepoints require KFGQPC Uthman Taha Naskh font for correct rendering.',
    },
    translation: {
      name: "Bridges' Translation",
      author: 'Fadel Soliman',
      source: 'quran.com (translation ID 149)',
      license: 'Unknown — verify with bridgesislam.com before commercial use',
    },
    font: {
      name: 'KFGQPC Uthman Taha Naskh',
      license: 'Proprietary — redistribution confirmed',
      notes: 'Required for PUA-encoded quran.com corpus.',
    },
    surahMetadata: {
      source: 'quran.com API / risan/quran-json',
      license: 'MIT (risan/quran-json)',
    },
  };

  await writeFile(join(OUTPUT_DIR, 'provenance.json'), JSON.stringify(provenance), 'utf8');
  console.log('  ✓ Metadata files written');
}

async function buildManifest() {
  const { glob } = await import('node:fs/promises');
  const hashes = {};
  const files = [];

  // Collect all dataset files (skip directories and manifest itself)
  for await (const file of glob('**/*', { cwd: OUTPUT_DIR })) {
    if (file === 'manifest.json') continue;
    const s = await stat(join(OUTPUT_DIR, file));
    if (s.isFile()) files.push(file);
  }

  files.sort();

  for (const file of files) {
    hashes[file] = await sha256File(join(OUTPUT_DIR, file));
  }

  const manifest = {
    packageVersion: PACKAGE_VERSION,
    builtAt: new Date().toISOString(),
    files: hashes,
  };

  await writeFile(join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf8');
  console.log(`  ✓ manifest.json written with SHA-256 hashes for ${files.length} files`);
}

async function validateDataset() {
  const errors = [];

  // Verify manifest hashes match actual file content
  const manifest = JSON.parse(await readFile(join(OUTPUT_DIR, 'manifest.json'), 'utf8'));

  for (const [file, expectedHash] of Object.entries(manifest.files)) {
    const actualHash = await sha256File(join(OUTPUT_DIR, file));
    if (actualHash !== expectedHash) {
      errors.push(`Hash mismatch: ${file}`);
    }
  }

  // Verify all expected files are in manifest
  for (let n = 1; n <= 114; n++) {
    const key = `surah/${surahNumber(n)}.json`;
    if (!manifest.files[key]) errors.push(`Missing from manifest: ${key}`);
  }
  for (const f of ['surahs.json', 'juz.json', 'annotations.json', 'provenance.json']) {
    if (!manifest.files[f]) errors.push(`Missing from manifest: ${f}`);
  }

  // Verify surahs.json
  const surahs = JSON.parse(await readFile(join(OUTPUT_DIR, 'surahs.json'), 'utf8'));
  if (surahs.length !== 114) errors.push(`surahs.json: ${surahs.length} entries, expected 114`);
  for (const s of surahs) {
    if (s.juz == null) errors.push(`surahs.json: surah ${s.n} has null juz`);
    if (s.count !== SURAH_VERSE_COUNTS[s.n - 1]) {
      errors.push(`surahs.json: surah ${s.n} count=${s.count}, expected ${SURAH_VERSE_COUNTS[s.n - 1]}`);
    }
  }

  // Verify juz.json
  const juz = JSON.parse(await readFile(join(OUTPUT_DIR, 'juz.json'), 'utf8'));
  if (juz.length !== 30) errors.push(`juz.json: ${juz.length} entries, expected 30`);
  if (new Set(juz.map((j) => j.j)).size !== juz.length) errors.push(`juz.json: duplicate juz numbers`);

  // Verify annotations.json
  const ann = JSON.parse(await readFile(join(OUTPUT_DIR, 'annotations.json'), 'utf8'));
  if (ann.basmala.prefix.length !== 112) {
    errors.push(`annotations.json: basmala.prefix has ${ann.basmala.prefix.length}, expected 112`);
  }
  if (ann.sajda.length !== 15) {
    errors.push(`annotations.json: sajda has ${ann.sajda.length}, expected 15`);
  }

  // Verify surah file content
  let totalAyahs = 0;
  for (let n = 1; n <= 114; n++) {
    const data = JSON.parse(
      await readFile(join(OUTPUT_DIR, 'surah', `${surahNumber(n)}.json`), 'utf8'),
    );
    if (data.ar.some((v) => v === '')) errors.push(`surah/${surahNumber(n)}.json: empty Arabic verse`);
    if (data.en.some((v) => v === '')) errors.push(`surah/${surahNumber(n)}.json: empty English verse`);
    totalAyahs += data.ar.length;
  }
  if (totalAyahs !== TOTAL_AYAHS) {
    errors.push(`Total ayahs from files: ${totalAyahs}, expected ${TOTAL_AYAHS}`);
  }

  if (errors.length > 0) {
    console.error('\n  Validation errors:');
    for (const e of errors) console.error(`    - ${e}`);
    throw new Error(`Post-build validation failed with ${errors.length} error(s)`);
  }

  console.log(`  ✓ All ${Object.keys(manifest.files).length} files verified`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nQuranAtlas Dataset Builder v${PACKAGE_VERSION}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  // ── Fetch Arabic corpus ──────────────────────────────────────────────────

  console.log('Step 1/6: Fetching Arabic corpus...');
  let arabicBySurah;

  try {
    const tasks = Array.from({ length: 114 }, (_, i) => () => fetchUthmaniArabicFromApi(i + 1));
    arabicBySurah = await runWithConcurrency(tasks, CONCURRENCY, 'Arabic');
    console.log('  ✓ Arabic corpus fetched from quran.com API');
  } catch (apiErr) {
    console.warn(`  API failed (${apiErr.message}), trying GitHub fallback...`);
    arabicBySurah = await fetchFromGitHubFallback();
    console.log('  ✓ Arabic corpus fetched from quran-json GitHub fallback');
  }

  // ── Fetch Translation ────────────────────────────────────────────────────

  console.log("\nStep 2/6: Fetching Bridges' translation (Fadel Soliman)...");
  let translationBySurah;

  try {
    const tasks = Array.from({ length: 114 }, (_, i) => () => fetchTranslationFromApi(i + 1));
    translationBySurah = await runWithConcurrency(tasks, CONCURRENCY, 'Translation');
    console.log("  ✓ Bridges' translation fetched");
  } catch (err) {
    console.error(`\n  Failed to fetch translation after retries: ${err.message}`);
    process.exit(1);
  }

  // ── Fetch Metadata ───────────────────────────────────────────────────────

  console.log('\nStep 3/6: Fetching surah and juz metadata...');
  let surahMeta, juzData;
  try {
    [surahMeta, juzData] = await Promise.all([fetchSurahMetaFromApi(), fetchJuzFromApi()]);
  } catch (err) {
    console.error(`  Metadata fetch failed after retries: ${err.message}`);
    process.exit(1);
  }
  console.log('  ✓ Metadata fetched');

  // ── Write Surah Files ────────────────────────────────────────────────────

  console.log('\nStep 4/6: Writing per-surah JSON files...');
  await buildSurahFiles(arabicBySurah, translationBySurah);

  // ── Write Metadata + Manifest ────────────────────────────────────────────

  console.log('\nStep 5/6: Writing metadata files and manifest...');
  await buildMetadataFiles(surahMeta, juzData);
  await buildManifest();

  // ── Validate ─────────────────────────────────────────────────────────────

  console.log('\nStep 6/6: Validating dataset...');
  await validateDataset();

  console.log('\n✓ Dataset build complete.\n');
}

main().catch((err) => {
  console.error('\n✗ Build failed:', err.message);
  process.exit(1);
});
