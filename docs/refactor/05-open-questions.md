# Open Questions For QuranAtlas Data Refactor

## Purpose

This document captures decisions that should be answered before implementing later phases.

Do not block Phase 1 and Phase 2 on all questions. Only the first section is immediately important.

## Must Answer Before Phase 1

1. Should knowledge files live under `public/dataset/knowledge/**` or should the project introduce a separate `public/knowledge/**` root?

Recommended answer: keep everything under `public/dataset/**` for now.

2. Should passage data be manually curated, imported from a source, or generated?

Recommended answer: start manually curated for a small set of surahs, then expand.

3. Should an ayah belong to exactly one passage?

Recommended answer: yes for Phase 1. Allow overlapping thematic collections later.

4. Should theme tags be manually curated or generated?

Recommended answer: manually curate initial taxonomy and use generated suggestions only after review.

5. Which surahs should be used as pilot data?

Recommended answer: Al-Fatihah, Al-Baqarah opening, Ayat al-Kursi, Al-Kahf opening, Yasin selected passages, Juz Amma.

## Must Answer Before Phase 2

6. What is the default reader interaction?

Options:

- tap ayah opens existing ayah menu
- tap ayah opens reflection bottom sheet
- long press opens reflection
- small reflect icon opens reflection

Recommended answer: keep existing tap behavior if users expect it; add a subtle reflect action in the ayah menu or bottom sheet.

7. Should prompts be shown before tafsir or after tafsir?

Recommended answer: show one prompt first, then allow “understand” expansion.

8. Should users be able to save reflections in Phase 2?

Recommended answer: optional. If added, store locally first.

9. Should reflection prompts adapt to user level?

Recommended answer: yes, but only with simple beginner/intermediate/advanced tags.

## Must Answer Before Claims

10. Who reviews extracted claims?

11. Which tafsir sources are allowed for claim extraction?

12. How should ikhtilaf be represented?

13. How should weak reports and Isra'iliyyat be labelled?

14. Should claims preserve exact source quotation or only summaries?

Recommended answer: preserve both when licensing allows.

## Must Answer Before AI/RAG

15. Is AI server-side, on-device, or hybrid?

16. Can AI synthesize across sources or only retrieve and summarize?

17. Are citations mandatory in every AI answer?

Recommended answer: yes.

18. Should the AI refuse legal/creedal conclusions without sourced support?

Recommended answer: yes.

19. Should user reflections be used as personalization context?

20. Should user reflections sync across devices?

## Product Decisions

21. Is the app mobile-first or desktop-first?

22. Is offline reflection required?

23. Is search required offline?

24. Will the app support community reflections later?

25. Is the launch language English-only or multilingual?

## Engineering Decisions

26. Is `public/dataset/**` committed for all profiles or baseline only?

27. Should heavy build steps use SQLite/DuckDB?

28. Should generated knowledge files be committed?

29. Should schemas be validated with Zod, JSON Schema, or custom validators?

Recommended answer: JSON Schema for data files, TypeScript types for runtime, custom validators for cross-file Quran-specific checks.
