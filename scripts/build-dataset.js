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
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${description}: ${url}`);
  return res.json();
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
  return data.juzs.map((j) => {
    const firstSurah = Object.keys(j.verse_mapping)[0];
    const ayah = parseInt(j.verse_mapping[firstSurah].split('-')[0], 10);
    return { j: j.juz_number, s: parseInt(firstSurah, 10), a: ayah };
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
  await writeFile(join(OUTPUT_DIR, 'surahs.json'), JSON.stringify(surahMeta), 'utf8');
  await writeFile(join(OUTPUT_DIR, 'juz.json'), JSON.stringify(juzData), 'utf8');

  const annotations = {
    basmala: {
      counted: [1], // Surah 1: basmala is verse 1:1
      prefix: Array.from({ length: 112 }, (_, i) => i + 2).filter((n) => n !== 9), // surahs 2-114 except 9
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nQuranAtlas Dataset Builder v${PACKAGE_VERSION}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  // ── Fetch Arabic corpus ──────────────────────────────────────────────────

  console.log('Step 1/5: Fetching Arabic corpus...');
  const arabicBySurah = [];

  try {
    for (let n = 1; n <= 114; n++) {
      process.stdout.write(`\r  Surah ${n}/114`);
      arabicBySurah.push(await fetchUthmaniArabicFromApi(n));
      if (n < 114) await sleep(150); // polite rate limiting
    }
    console.log('\n  ✓ Arabic corpus fetched from quran.com API');
  } catch (apiErr) {
    console.warn(`\n  API failed (${apiErr.message}), trying GitHub fallback...`);
    const fallback = await fetchFromGitHubFallback();
    arabicBySurah.length = 0;
    arabicBySurah.push(...fallback);
    console.log('  ✓ Arabic corpus fetched from quran-json GitHub fallback');
  }

  // ── Fetch Translation ────────────────────────────────────────────────────

  console.log("\nStep 2/5: Fetching Bridges' translation (Fadel Soliman)...");
  const translationBySurah = [];

  for (let n = 1; n <= 114; n++) {
    process.stdout.write(`\r  Surah ${n}/114`);
    try {
      translationBySurah.push(await fetchTranslationFromApi(n));
    } catch (err) {
      console.error(`\n  Failed to fetch translation for surah ${n}:`, err.message);
      process.exit(1);
    }
    if (n < 114) await sleep(150);
  }
  console.log("\n  ✓ Bridges' translation fetched");

  // ── Fetch Metadata ───────────────────────────────────────────────────────

  console.log('\nStep 3/5: Fetching surah and juz metadata...');
  const [surahMeta, juzData] = await Promise.all([fetchSurahMetaFromApi(), fetchJuzFromApi()]);
  console.log('  ✓ Metadata fetched');

  // ── Write Surah Files ────────────────────────────────────────────────────

  console.log('\nStep 4/5: Writing per-surah JSON files...');
  await buildSurahFiles(arabicBySurah, translationBySurah);

  // ── Write Metadata + Manifest ────────────────────────────────────────────

  console.log('\nStep 5/5: Writing metadata files and manifest...');
  await buildMetadataFiles(surahMeta, juzData);
  await buildManifest();

  console.log('\n✓ Dataset build complete.\n');
}

main().catch((err) => {
  console.error('\n✗ Build failed:', err.message);
  process.exit(1);
});
