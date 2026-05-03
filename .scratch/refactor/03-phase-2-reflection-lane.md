# Phase 2 — Reflection Lane

## Purpose

Phase 2 adds structured reflection prompts that can be displayed inside the reader without overwhelming the reading experience.

The goal is to make tadabbur feel natural:

```text
Read ayah → tap ayah → see one good prompt → optionally go deeper
```

## Scope

Add:

```text
data/taxonomy/prompt-lenses.json
data/normalized/reflection/prompts.json
scripts/data/build-reflection-dataset.mjs
src/data/reflection-dataset.ts
public/dataset/reflection/**
```

## Prompt Lenses

A prompt lens defines the angle of reflection.

Recommended initial lenses:

```json
[
  {
    "id": "wording",
    "label": "Wording",
    "description": "Reflect on word choice, order, repetition, and emphasis."
  },
  {
    "id": "context",
    "label": "Context",
    "description": "Reflect on the ayah within its passage, surah, and revelation setting."
  },
  {
    "id": "heart",
    "label": "Heart",
    "description": "Reflect on what this ayah reveals about the state of the heart."
  },
  {
    "id": "life",
    "label": "Life",
    "description": "Reflect on how this ayah speaks to lived experience."
  },
  {
    "id": "action",
    "label": "Action",
    "description": "Reflect on one concrete response to the ayah."
  }
]
```

## Source Schema: prompts.json

```json
[
  {
    "promptId": "p_2_2_heart_001",
    "ayahRange": {
      "start": "2:2",
      "end": "2:2"
    },
    "lens": "heart",
    "difficulty": "beginner",
    "promptType": "introspective",
    "text": {
      "en": "What kind of heart is ready to receive guidance from this Book?"
    },
    "requiresTafsir": false,
    "tags": ["guidance", "taqwa"],
    "source": {
      "kind": "curated",
      "reviewStatus": "approved"
    },
    "safety": {
      "avoidWhen": [],
      "requiresDisclaimer": false
    }
  }
]
```

## Build Output: prompts/{NNN}.json

```json
{
  "surah": 2,
  "prompts": [
    {
      "promptId": "p_2_2_heart_001",
      "startKey": "2:2",
      "endKey": "2:2",
      "lens": "heart",
      "difficulty": "beginner",
      "promptType": "introspective",
      "text": {
        "en": "What kind of heart is ready to receive guidance from this Book?"
      },
      "tags": ["guidance", "taqwa"],
      "requiresTafsir": false
    }
  ]
}
```

## Validation Rules

The build must fail if:

- prompt id is duplicated
- ayah range is invalid
- lens id is missing from `prompt-lenses.json`
- difficulty is not one of `beginner`, `intermediate`, `advanced`
- prompt has empty text
- prompt references a missing theme tag
- unapproved prompts are included in baseline output
- `requiresTafsir: true` prompt has no supporting tafsir/claim reference once claims exist

## Runtime API

```ts
export async function loadReflectionPromptsForSurah(surahNumber: number): Promise<ReflectionPromptSurah>;

export async function getPromptsForAyah(ayahKey: string, options?: {
  lens?: string;
  difficulty?: string;
}): Promise<ReflectionPrompt[]>;

export async function getReflectionEntryPoint(ayahKey: string, userLevel?: 'beginner' | 'intermediate' | 'advanced'): Promise<ReflectionPrompt | null>;
```

## UX Rules

The reader should never show all prompts at once.

Default behavior:

1. User taps ayah.
2. Bottom sheet opens.
3. Show one selected prompt.
4. Allow “more lenses” if user wants depth.
5. Allow journaling only after the first prompt.

## Prompt Selection Priority

Suggested selection order:

1. User-selected lens if present.
2. Beginner prompt if user is new.
3. Prompt matching ayah’s strongest theme.
4. Heart or life lens for general use.
5. Action lens after user has reflected.

## Non-Goals

Do not add:

- AI-generated live prompts
- complex scoring
- social/community reflection
- heavy tafsir explanation
- long journaling flow

Those come later.
