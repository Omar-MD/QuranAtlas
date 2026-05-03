# QuranAtlas Data Lanes

## Purpose

This document defines the future data lanes for QuranAtlas. It should be used to prevent the reader dataset, knowledge dataset, reflection dataset, and AI/search dataset from becoming tangled.

## Current State

The existing pipeline primarily supports the Text Lane:

```text
catalog → fetch → normalized → build → public/dataset → runtime reader
```

This should remain stable.

## Lane 1: Text Lane

### Responsibility

Serve canonical reader content.

### Data

- Arabic text by riwayah
- translations
- tafsir display text
- surah metadata
- juz metadata
- verse aliases
- source provenance
- manifest

### Runtime Usage

- Reader screen
- translation picker
- tafsir picker
- offline packs
- service worker route categories

### Rule

The text lane must stay deterministic, fast, and offline-safe.

## Lane 2: Knowledge Lane

### Responsibility

Represent structured understanding around ayat and passages.

### Data

- ayah themes
- passage groupings
- concepts
- divine names
- spiritual states
- cross-references
- rhetorical features
- scholarly claims later

### Runtime Usage

- theme chips
- passage context
- related ayat
- guided reading journeys
- AI grounding

### Rule

The knowledge lane may enrich the reader, but the reader must not depend on it to render basic text.

## Lane 3: Reflection Lane

### Responsibility

Guide the user into tadabbur without overwhelming the reader.

### Data

- reflection prompts
- prompt lenses
- difficulty levels
- suggested actions
- dua prompts
- journaling scaffolds

### Runtime Usage

- ayah bottom sheet
- “Guide me” flow
- daily tadabbur
- slow reading mode

### Rule

Reflection data should be curated, structured, and small enough to load by surah.

## Lane 4: Search / AI Lane

### Responsibility

Support retrieval, search, summarization, and AI-assisted reflection.

### Data

- RAG chunks
- lexical indexes
- vector indexes if needed
- source-to-chunk maps
- ayah-to-chunk maps
- citation metadata

### Runtime Usage

- AI copilot
- semantic search
- scholarly Q&A
- deep exploration

### Rule

AI must retrieve from structured data. It should not freely improvise religious meaning from raw source text.

## Recommended Runtime File Layout

```text
public/dataset/
  manifest.json
  provenance.json

  text/
    riwayat/
    translations/
    tafsir/
    indexes/
    surahs.json
    juz.json

  knowledge/
    ayah/
    passages/
    indexes/

  reflection/
    prompts/
    actions/
    lenses.json
    indexes/

  search/
    lexical/
    rag/
    vector/
```

## Recommended Source Layout

```text
data/
  catalog/
  normalized/
    quran/
    translations/
    tafsir/
    knowledge/
    reflection/
  taxonomy/
```
