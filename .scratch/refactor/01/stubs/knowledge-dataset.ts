import { get } from 'svelte/store';

export type AyahKey = `${number}:${number}`;

export interface AyahTheme {
  id: string;
  weight: number;
  certainty: 'high' | 'medium' | 'low';
}

export interface AyahKnowledge {
  key: AyahKey;
  passageId: string | null;
  themes: AyahTheme[];
}

export interface AyahKnowledgeSurah {
  surah: number;
  version: string;
  ayahs: AyahKnowledge[];
}

export interface Passage {
  id: string;
  startKey: AyahKey;
  endKey: AyahKey;
  title: Record<string, string>;
  summary: Record<string, string>;
  themes: string[];
  roleInSurah: string;
}

export interface PassageSurah {
  surah: number;
  version: string;
  passages: Passage[];
}

const ayahKnowledgeCache = new Map<number, Promise<AyahKnowledgeSurah | null>>();
const passageCache = new Map<number, Promise<PassageSurah | null>>();

function padSurah(n: number): string {
  return String(n).padStart(3, '0');
}

function parseAyahKey(key: AyahKey): { surah: number; ayah: number } | null {
  const match = /^([1-9][0-9]*):([1-9][0-9]*)$/.exec(key);
  if (!match) return null;
  return { surah: Number(match[1]), ayah: Number(match[2]) };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function loadAyahKnowledgeForSurah(
  surahNumber: number
): Promise<AyahKnowledgeSurah | null> {
  if (!ayahKnowledgeCache.has(surahNumber)) {
    ayahKnowledgeCache.set(
      surahNumber,
      fetchJson<AyahKnowledgeSurah>(`/dataset/knowledge/ayah/${padSurah(surahNumber)}.json`)
    );
  }
  return ayahKnowledgeCache.get(surahNumber)!;
}

export function loadPassagesForSurah(
  surahNumber: number
): Promise<PassageSurah | null> {
  if (!passageCache.has(surahNumber)) {
    passageCache.set(
      surahNumber,
      fetchJson<PassageSurah>(`/dataset/knowledge/passages/${padSurah(surahNumber)}.json`)
    );
  }
  return passageCache.get(surahNumber)!;
}

export async function getAyahKnowledge(ayahKey: AyahKey): Promise<AyahKnowledge | null> {
  const parsed = parseAyahKey(ayahKey);
  if (!parsed) return null;

  const surah = await loadAyahKnowledgeForSurah(parsed.surah);
  if (!surah) return null;

  return surah.ayahs.find((ayah) => ayah.key === ayahKey) ?? null;
}

export async function getThemesForAyah(ayahKey: AyahKey): Promise<AyahTheme[]> {
  const knowledge = await getAyahKnowledge(ayahKey);
  return knowledge?.themes ?? [];
}

export async function getPassageForAyah(ayahKey: AyahKey): Promise<Passage | null> {
  const parsed = parseAyahKey(ayahKey);
  if (!parsed) return null;

  const knowledge = await getAyahKnowledge(ayahKey);
  if (!knowledge?.passageId) return null;

  const passageSurah = await loadPassagesForSurah(parsed.surah);
  if (!passageSurah) return null;

  return passageSurah.passages.find((passage) => passage.id === knowledge.passageId) ?? null;
}

export function clearKnowledgeDatasetCache(): void {
  ayahKnowledgeCache.clear();
  passageCache.clear();
}
