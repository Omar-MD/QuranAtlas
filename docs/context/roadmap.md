# Roadmap

Features agreed but not yet shipped. When work starts the entry moves into
the active plan; when it ships, it moves to `implemented.md`.

## Read

- Juz / hizb / rubʿ / ruku navigation — static metadata tables, jump-to in command sheet + drawer.
- Full-text Arabic + translation search — index built at precache time.
- Reading plan / khatm tracker / streak — new `readingPlan` IDB store.
- Page-break indicators (Hafs first) — KFGQPC per-verse page numbers.

## Memorize

- Per-verse memorization status flag (`none | learning | memorized | review`).
- Hide-drill / cover-text mode — blur Arabic or translation, tap-to-reveal.
- Spaced-repetition review queue (SRS).

## Listen (audio polish)

- Reciter dataset acquisition pipeline — forced-alignment for word-level timing.
- Reader long-press / double-tap "Play from here" entry.
- Settings UI — reciter picker, speed/repeat defaults, per-reciter storage row.
- A-B loop UX + Repeat-N drill UI.
- Audio brand artwork PNG assets (`public/icons/audio-art-{96,256,512}.png`).
- `journey-h-audio.spec.js` e2e (`@offline` project).

## Language aids

- Word-by-word translation — per-verse `words` field.
- Transliteration — translation-pack-like store.
- Tajweed coloring — KFGQPC tajweed-marked corpus.

## Share / sync

- Copy verse + share (Web Share API).
- Marks + bookmarks export / import (JSON).
- Multi-device sync — E2E-encrypted, account-less.

## Tafsir

- External tafsir packs.
- Ordered recommended Arabic tafsir source list: Tafsir Ibn Kathir; Tafsir al-Tabari / Jami' al-Bayan; Tafsir al-Baghawi / Ma'alim al-Tanzil; Tafsir al-Sa'di / Taysir al-Karim al-Rahman; al-Mukhtasar fi al-Tafsir; al-Tafsir al-Muyassar; Tafsir al-Qurtubi; al-Muharrar al-Wajiz / Ibn Atiyyah; Adwa' al-Bayan / al-Shinqiti; al-Tahrir wa al-Tanwir / Ibn Ashur.

## Tadabbur / study

- Reader-facing Knowledge Lane UI — subtle passage context and ayah theme chips inside the existing interaction flow.
- Reflection Lane prompts — one curated prompt first, optional more-lenses expansion.
- Scholarly claims dataset — source-backed knowledge atoms for citations and guardrails.
- Citation-first retrieval / AI study assist — lexical and chunked retrieval before any broader synthesis.

## Multi-layer marks

- User-personal alias overrides.
- Edge creation UI + layer-overlap auto-suggest.
- Per-edge-kind reflection prompt.

## Dataset enrichment

- Revelation context (Makki / Madani, era, asbab).
- Arabic roots — pre-computed 3-letter roots.
- Muhkam / mutashabih classification.

Longer-range lane architecture, sequencing, and unresolved planning questions live in `future.md`.

## Infra

- Versioned `_shapes` + cursor-walk back-fill (before v1.0 launch).
- Remove `'unsafe-inline'` from `style-src`.
- Lazy-mount overlays.
