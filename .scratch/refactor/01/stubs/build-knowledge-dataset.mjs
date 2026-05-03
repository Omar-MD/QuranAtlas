#!/usr/bin/env node

/**
 * Phase 01 Knowledge Lane Builder
 *
 * Reads:
 * - data/taxonomy/themes.json
 * - data/normalized/knowledge/passages.json
 * - data/normalized/knowledge/ayah-themes.json
 *
 * Writes:
 * - public/dataset/knowledge/ayah/{NNN}.json
 * - public/dataset/knowledge/passages/{NNN}.json
 * - public/dataset/knowledge/indexes/theme-to-ayah.json
 * - public/dataset/knowledge/indexes/ayah-to-passage.json
 * - public/dataset/knowledge/indexes/passage-to-ayah.json
 *
 * This is an implementation skeleton. Wire `loadQuranMeta()` to your existing
 * surah metadata or corpus-count source before using in production.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const VERSION = 'knowledge-v1';

const PATHS = {
  themes: 'data/taxonomy/themes.json',
  passages: 'data/normalized/knowledge/passages.json',
  ayahThemes: 'data/normalized/knowledge/ayah-themes.json',
  outRoot: 'public/dataset/knowledge'
};

const ALLOWED_ROLE_IN_SURAH = new Set([
  'opening',
  'opening_classification',
  'narrative',
  'command',
  'warning',
  'promise',
  'argument',
  'dua',
  'conclusion',
  'transition',
  'unknown'
]);

const ALLOWED_REVIEW_STATUS = new Set(['draft', 'approved', 'deprecated']);
const ALLOWED_THEME_SOURCE = new Set(['curated', 'imported', 'generated_reviewed']);
const ALLOWED_CERTAINTY = new Set(['high', 'medium', 'low']);

const EXPECTED_AYAH_COUNTS = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98,
  20: 135, 21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88,
  29: 69, 30: 60, 31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182,
  38: 88, 39: 75, 40: 85, 41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35,
  47: 38, 48: 29, 49: 18, 50: 45, 51: 60, 52: 49, 53: 62, 54: 55, 55: 78,
  56: 96, 57: 29, 58: 22, 59: 24, 60: 13, 61: 14, 62: 11, 63: 11, 64: 18,
  65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44, 71: 28, 72: 28, 73: 20,
  74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42, 81: 29, 82: 19,
  83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20, 91: 15,
  92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
  101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6,
  110: 3, 111: 5, 112: 4, 113: 5, 114: 6
};

function resolvePath(p) {
  return path.join(ROOT, p);
}

async function readJson(p) {
  const raw = await fs.readFile(resolvePath(p), 'utf8');
  return JSON.parse(raw);
}

async function writeJson(p, value) {
  const abs = resolvePath(p);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function padSurah(n) {
  return String(n).padStart(3, '0');
}

function fail(message) {
  throw new Error(`[knowledge] ${message}`);
}

function parseAyahKey(key) {
  if (typeof key !== 'string') fail(`Ayah key must be string: ${key}`);
  const match = key.match(/^([1-9][0-9]*):([1-9][0-9]*)$/);
  if (!match) fail(`Invalid ayah key format: ${key}`);
  return { surah: Number(match[1]), ayah: Number(match[2]) };
}

function validateAyahKey(key, ayahCounts) {
  const parsed = parseAyahKey(key);
  const count = ayahCounts[parsed.surah];
  if (!count) fail(`Invalid surah in ayah key: ${key}`);
  if (parsed.ayah > count) fail(`Invalid ayah number in key: ${key}`);
  return parsed;
}

function compareAyahKeys(a, b) {
  const pa = parseAyahKey(a);
  const pb = parseAyahKey(b);
  if (pa.surah !== pb.surah) return pa.surah - pb.surah;
  return pa.ayah - pb.ayah;
}

function expandAyahRange(startKey, endKey, ayahCounts) {
  const start = validateAyahKey(startKey, ayahCounts);
  const end = validateAyahKey(endKey, ayahCounts);

  if (start.surah !== end.surah) {
    fail(`Passage range crosses surah boundary: ${startKey}..${endKey}`);
  }
  if (end.ayah < start.ayah) {
    fail(`Passage end before start: ${startKey}..${endKey}`);
  }

  const keys = [];
  for (let ayah = start.ayah; ayah <= end.ayah; ayah += 1) {
    keys.push(`${start.surah}:${ayah}`);
  }
  return keys;
}

function validateThemes(themes) {
  if (!Array.isArray(themes)) fail('themes.json must be an array');

  const map = new Map();
  for (const theme of themes) {
    if (!theme || typeof theme !== 'object') fail('Theme entry must be object');
    if (!theme.id || typeof theme.id !== 'string') fail('Theme missing id');
    if (!/^[a-z][a-z0-9-]*$/.test(theme.id)) fail(`Invalid theme id: ${theme.id}`);
    if (map.has(theme.id)) fail(`Duplicate theme id: ${theme.id}`);
    if (!theme.label?.en) fail(`Theme missing label.en: ${theme.id}`);
    if (!theme.description) fail(`Theme missing description: ${theme.id}`);
    map.set(theme.id, theme);
  }

  for (const theme of themes) {
    if (theme.parentId !== null && theme.parentId !== undefined && !map.has(theme.parentId)) {
      fail(`Theme ${theme.id} has missing parentId: ${theme.parentId}`);
    }
    for (const related of theme.related ?? []) {
      if (!map.has(related)) fail(`Theme ${theme.id} has missing related theme: ${related}`);
    }
  }

  return map;
}

function validatePassages(passages, ayahCounts, themeMap) {
  if (!Array.isArray(passages)) fail('passages.json must be an array');

  const ids = new Set();
  const occupiedAyah = new Map();

  const approved = [];

  for (const passage of passages) {
    if (!passage || typeof passage !== 'object') fail('Passage entry must be object');

    if (!passage.id) fail('Passage missing id');
    if (ids.has(passage.id)) fail(`Duplicate passage id: ${passage.id}`);
    ids.add(passage.id);

    if (!Number.isInteger(passage.surah) || passage.surah < 1 || passage.surah > 114) {
      fail(`Invalid passage surah for ${passage.id}`);
    }

    const start = validateAyahKey(passage.startKey, ayahCounts);
    const end = validateAyahKey(passage.endKey, ayahCounts);

    if (start.surah !== passage.surah || end.surah !== passage.surah) {
      fail(`Passage ${passage.id} surah does not match keys`);
    }

    if (!passage.title?.en) fail(`Passage ${passage.id} missing title.en`);
    if (!passage.summary?.en) fail(`Passage ${passage.id} missing summary.en`);

    if (!Array.isArray(passage.themes)) fail(`Passage ${passage.id} themes must be array`);
    for (const themeId of passage.themes) {
      if (!themeMap.has(themeId)) fail(`Passage ${passage.id} uses unknown theme: ${themeId}`);
    }

    if (!ALLOWED_ROLE_IN_SURAH.has(passage.roleInSurah ?? 'unknown')) {
      fail(`Passage ${passage.id} has invalid roleInSurah: ${passage.roleInSurah}`);
    }

    const reviewStatus = passage.source?.reviewStatus;
    if (!ALLOWED_REVIEW_STATUS.has(reviewStatus)) {
      fail(`Passage ${passage.id} has invalid reviewStatus: ${reviewStatus}`);
    }

    if (reviewStatus !== 'approved') continue;

    const keys = expandAyahRange(passage.startKey, passage.endKey, ayahCounts);
    for (const key of keys) {
      const existing = occupiedAyah.get(key);
      if (existing) {
        fail(`Overlapping passages for ${key}: ${existing} and ${passage.id}`);
      }
      occupiedAyah.set(key, passage.id);
    }

    approved.push(passage);
  }

  return approved;
}

function validateAyahThemes(ayahThemes, ayahCounts, themeMap) {
  if (!Array.isArray(ayahThemes)) fail('ayah-themes.json must be an array');

  const seen = new Set();

  for (const entry of ayahThemes) {
    if (!entry || typeof entry !== 'object') fail('Ayah theme entry must be object');
    validateAyahKey(entry.ayahKey, ayahCounts);

    if (seen.has(entry.ayahKey)) fail(`Duplicate ayah theme entry: ${entry.ayahKey}`);
    seen.add(entry.ayahKey);

    if (!Array.isArray(entry.themes) || entry.themes.length === 0) {
      fail(`Ayah theme entry must include at least one theme: ${entry.ayahKey}`);
    }

    for (const theme of entry.themes) {
      if (!themeMap.has(theme.id)) fail(`Unknown theme ${theme.id} for ${entry.ayahKey}`);
      if (typeof theme.weight !== 'number' || theme.weight < 0 || theme.weight > 1) {
        fail(`Invalid weight for ${entry.ayahKey}/${theme.id}`);
      }
      if (!ALLOWED_THEME_SOURCE.has(theme.source)) {
        fail(`Invalid source for ${entry.ayahKey}/${theme.id}: ${theme.source}`);
      }
      if (!ALLOWED_CERTAINTY.has(theme.certainty)) {
        fail(`Invalid certainty for ${entry.ayahKey}/${theme.id}: ${theme.certainty}`);
      }
    }
  }
}

function buildKnowledgeModel({ ayahCounts, passages, ayahThemes }) {
  const passagesBySurah = new Map();
  const ayahToPassage = {};
  const passageToAyah = {};

  for (const passage of passages) {
    const keys = expandAyahRange(passage.startKey, passage.endKey, ayahCounts);
    passageToAyah[passage.id] = keys;
    for (const key of keys) ayahToPassage[key] = passage.id;

    const list = passagesBySurah.get(passage.surah) ?? [];
    list.push({
      id: passage.id,
      startKey: passage.startKey,
      endKey: passage.endKey,
      title: passage.title,
      summary: passage.summary,
      themes: passage.themes,
      roleInSurah: passage.roleInSurah ?? 'unknown'
    });
    passagesBySurah.set(passage.surah, list);
  }

  const themesByAyah = new Map();
  const themeToAyah = {};

  for (const entry of ayahThemes) {
    const sortedThemes = [...entry.themes]
      .map((theme) => ({
        id: theme.id,
        weight: theme.weight,
        certainty: theme.certainty
      }))
      .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

    themesByAyah.set(entry.ayahKey, sortedThemes);

    for (const theme of sortedThemes) {
      themeToAyah[theme.id] ??= [];
      themeToAyah[theme.id].push({
        ayahKey: entry.ayahKey,
        weight: theme.weight
      });
    }
  }

  for (const themeId of Object.keys(themeToAyah)) {
    themeToAyah[themeId].sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return compareAyahKeys(a.ayahKey, b.ayahKey);
    });
  }

  const ayahFiles = {};
  const passageFiles = {};

  for (let surah = 1; surah <= 114; surah += 1) {
    const count = ayahCounts[surah];
    const ayahs = [];
    for (let ayah = 1; ayah <= count; ayah += 1) {
      const key = `${surah}:${ayah}`;
      ayahs.push({
        key,
        passageId: ayahToPassage[key] ?? null,
        themes: themesByAyah.get(key) ?? []
      });
    }

    ayahFiles[surah] = {
      surah,
      version: VERSION,
      ayahs
    };

    const passagesForSurah = passagesBySurah.get(surah) ?? [];
    passagesForSurah.sort((a, b) => compareAyahKeys(a.startKey, b.startKey));

    passageFiles[surah] = {
      surah,
      version: VERSION,
      passages: passagesForSurah
    };
  }

  return {
    ayahFiles,
    passageFiles,
    indexes: {
      themeToAyah: {
        version: VERSION,
        themes: themeToAyah
      },
      ayahToPassage: {
        version: VERSION,
        ayahToPassage
      },
      passageToAyah: {
        version: VERSION,
        passageToAyah
      }
    }
  };
}

async function writeKnowledgeDataset(model) {
  for (let surah = 1; surah <= 114; surah += 1) {
    await writeJson(`${PATHS.outRoot}/ayah/${padSurah(surah)}.json`, model.ayahFiles[surah]);
    await writeJson(`${PATHS.outRoot}/passages/${padSurah(surah)}.json`, model.passageFiles[surah]);
  }

  await writeJson(`${PATHS.outRoot}/indexes/theme-to-ayah.json`, model.indexes.themeToAyah);
  await writeJson(`${PATHS.outRoot}/indexes/ayah-to-passage.json`, model.indexes.ayahToPassage);
  await writeJson(`${PATHS.outRoot}/indexes/passage-to-ayah.json`, model.indexes.passageToAyah);
}

async function main() {
  const themes = await readJson(PATHS.themes);
  const passagesRaw = await readJson(PATHS.passages);
  const ayahThemes = await readJson(PATHS.ayahThemes);

  const themeMap = validateThemes(themes);
  const approvedPassages = validatePassages(passagesRaw, EXPECTED_AYAH_COUNTS, themeMap);
  validateAyahThemes(ayahThemes, EXPECTED_AYAH_COUNTS, themeMap);

  const model = buildKnowledgeModel({
    ayahCounts: EXPECTED_AYAH_COUNTS,
    passages: approvedPassages,
    ayahThemes
  });

  if (!process.argv.includes('--check')) {
    await writeKnowledgeDataset(model);
  }

  console.log(`[knowledge] ok: ${approvedPassages.length} approved passages, ${ayahThemes.length} ayah theme entries`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
