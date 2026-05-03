# Phase 1 — Knowledge Lane Skeleton

## Purpose

Phase 1 adds a minimal knowledge layer to QuranAtlas without changing the existing reader text pipeline.

The goal is to support:

- passage context
- ayah theme tags
- simple related ayat
- future reflection UX

## Scope

Add only three source inputs:

```text
data/taxonomy/themes.json
data/normalized/knowledge/passages.json
data/normalized/knowledge/ayah-themes.json
```

Add one build script:

```text
scripts/data/build-knowledge-dataset.mjs
```

Add one runtime module:

```text
src/data/knowledge-dataset.ts
```

Emit:

```text
public/dataset/knowledge/ayah/{NNN}.json
public/dataset/knowledge/passages/{NNN}.json
public/dataset/knowledge/indexes/theme-to-ayah.json
```

## Source Schema: themes.json

```json
[
  {
    "id": "guidance",
    "label": {
      "en": "Guidance",
      "ar": "الهداية"
    },
    "parentId": null,
    "aliases": ["hidayah", "being guided"],
    "related": ["taqwa", "revelation"],
    "description": "Allah guiding people to truth, clarity, obedience, and salvation."
  }
]
```

## Source Schema: passages.json

```json
[
  {
    "id": "2:1-5",
    "surah": 2,
    "startKey": "2:1",
    "endKey": "2:5",
    "title": {
      "en": "The qualities of those who receive guidance"
    },
    "summary": {
      "en": "The opening passage describes the people who benefit from the Book."
    },
    "themes": ["guidance", "taqwa", "belief"],
    "roleInSurah": "opening_classification"
  }
]
```

## Source Schema: ayah-themes.json

```json
[
  {
    "ayahKey": "2:2",
    "themes": [
      {
        "id": "guidance",
        "weight": 0.95,
        "source": "curated",
        "certainty": "high"
      },
      {
        "id": "taqwa",
        "weight": 0.85,
        "source": "curated",
        "certainty": "high"
      }
    ]
  }
]
```

## Build Output: ayah/{NNN}.json

```json
{
  "surah": 2,
  "version": "knowledge-v1",
  "ayahs": [
    {
      "key": "2:1",
      "passageId": "2:1-5",
      "themes": []
    },
    {
      "key": "2:2",
      "passageId": "2:1-5",
      "themes": [
        {
          "id": "guidance",
          "weight": 0.95,
          "certainty": "high"
        }
      ]
    }
  ]
}
```

## Build Output: passages/{NNN}.json

```json
{
  "surah": 2,
  "passages": [
    {
      "id": "2:1-5",
      "startKey": "2:1",
      "endKey": "2:5",
      "title": {
        "en": "The qualities of those who receive guidance"
      },
      "summary": {
        "en": "The opening passage describes the people who benefit from the Book."
      },
      "themes": ["guidance", "taqwa", "belief"],
      "roleInSurah": "opening_classification"
    }
  ]
}
```

## Validation Rules

The build must fail if:

- any ayah key is invalid
- any passage range is invalid
- any passage range crosses surah boundaries
- any theme id is missing from `themes.json`
- any ayah appears in more than one passage, unless explicitly allowed
- any passage has `startKey` after `endKey`
- any theme weight is outside `0..1`

## Runtime API

```ts
export async function loadAyahKnowledgeForSurah(surahNumber: number): Promise<AyahKnowledgeSurah>;

export async function loadPassagesForSurah(surahNumber: number): Promise<PassageSurah>;

export async function getPassageForAyah(ayahKey: string): Promise<Passage | null>;

export async function getThemesForAyah(ayahKey: string): Promise<AyahTheme[]>;
```

## Reader UX Integration

Phase 1 should only add subtle context:

- passage header: “This passage is about guidance and taqwa”
- ayah theme chips
- related ayat by theme later

Avoid:

- AI chat
- long explanations
- tafsir summaries in the reader by default
- aggressive prompts
