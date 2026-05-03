# Refactor Principles

## 1. Add Lanes, Do Not Entangle Features

Reader data, knowledge data, reflection data, and AI/search data must remain separate lanes.

This keeps the reader stable and allows each lane to scale independently.

## 2. Build-Time Intelligence, Runtime Simplicity

Complex data normalization, validation, indexing, and enrichment should happen at build time.

Runtime should load small, predictable JSON files.

## 3. Source Data Is Not Runtime Data

Source files may be rich, messy, editorial, or provider-specific.

Runtime files must be clean, small, deterministic, and optimized for the app.

## 4. Every Derived Layer Needs Provenance

If data is derived, curated, imported, or generated, that status must be visible in source metadata.

Future AI and scholarly trust depend on this.

## 5. Taxonomy Before Scale

Do not tag thousands of ayat before the theme taxonomy is stable.

A bad taxonomy creates long-term debt.

## 6. Passage Before Prompt

Reflection prompts need passage context.

Build passage awareness before building guided tadabbur prompts.

## 7. Prompt Before AI

A curated prompt system should exist before live AI reflection.

This gives the product a controlled tadabbur experience and gives AI a pattern to follow later.

## 8. Claims Before Synthesis

Do not allow AI to synthesize deeply from raw tafsir until scholarly claims and citation structures exist.

Claim extraction is the bridge between tafsir text and trustworthy AI guidance.

## 9. Optional Lanes Must Fail Softly

If knowledge, reflection, or AI data is missing, the reader must continue to work.

## 10. UX Should Reveal, Not Dump

The data layer may become rich.

The user interface should remain calm and progressive.
