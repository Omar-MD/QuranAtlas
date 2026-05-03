# Runtime and Offline Boundaries

## Purpose

This document defines how the new knowledge and reflection lanes should be consumed at runtime without compromising the existing reader performance and offline behavior.

## Existing Rule

The app reads only built files under `/dataset/**`.

This remains true.

The app must not read:

```text
data/catalog/**
data/normalized/**
data/taxonomy/**
```

at runtime.

## New Runtime Modules

Add:

```text
src/data/reader-dataset.ts
src/data/knowledge-dataset.ts
src/data/reflection-dataset.ts
src/data/source-index.ts
```

Keep `src/data/dataset.ts` as the high-level facade if that is already the public access layer.

## Reader Independence Rule

The reader must be able to render Arabic and translation without loading:

- knowledge files
- reflection files
- search files
- AI files

Knowledge and reflection should load lazily.

## Suggested Runtime Loading

When a surah opens:

1. Load Arabic text.
2. Load selected translation.
3. Load tafsir only if enabled.
4. Optionally preload knowledge for that surah.
5. Load reflection prompts only when user taps an ayah or opens reflection mode.

## Offline Packs

Offline packs should become source-aware and lane-aware.

Suggested categories:

```text
text-core
text-riwayah
text-translation
text-tafsir
knowledge-core
reflection-core
search-lexical
search-rag
```

## Manifest Extension

The manifest should describe emitted lanes:

```json
{
  "version": "2026.05",
  "profile": "baseline",
  "lanes": {
    "text": {
      "riwayat": ["qaloon"],
      "translations": ["saheeh"],
      "tafsir": ["muyassar"]
    },
    "knowledge": {
      "ayah": true,
      "passages": true,
      "themeIndex": true
    },
    "reflection": {
      "prompts": true,
      "lenses": true
    },
    "search": {
      "lexical": false,
      "rag": false,
      "vector": false
    }
  },
  "files": []
}
```

## Service Worker Rule

The service worker should not hardcode knowledge or reflection paths independently.

Route definitions should derive from manifest categories where possible.

## Failure Behavior

If knowledge or reflection files fail to load:

- reader still works
- no fatal error
- reflection UI shows unavailable state
- app logs a recoverable data error

## Recommended UX Fallback

If no prompt exists for an ayah:

```text
“Pause on this ayah. What is Allah teaching, warning, or inviting you toward here?”
```

This fallback should be local and deterministic.
