# Open Issues

Known bugs, edge cases, and blocking debt. Resolve and delete the entry —
do not leave a "we know" record after fixing. Lasting record lives in code + git.

## Product-scope cleanup debt

- **Remove audio product/code surface** — audio/listen is removed product scope. Later source cleanup should remove or quarantine audio UI, route/cache assumptions, `audioPosition` persistence, and reader audio hooks without weakening reader behavior.
- **Remove personal marks/tags/review/edges product/code surface** — personal marks, tags, notes, review, and edges are removed product scope. Later source cleanup should preserve bookmarks as reading continuity while removing or quarantining mark/review/edge implementation.
- **Align onboarding and shortcut copy with Reader First** — remove mark/tag-first tutorial and shortcut wording from user-facing copy when source cleanup or UI copy work reaches those surfaces.

## Performance

- **`reshape()` MutationObserver walks every chunk-appended node** — `src/app-bootstrap.ts:117-118` triggers per-node reshape via `font-reshape.ts::reshapeAddedNodes`. Hot path during long-surah scroll; one-line fix to scope to the appended chunk root.

## Architectural debt

- **`core/db.ts` is a god module** — 49+ importers across `src/`. Conflates connection lifecycle, schema validation, and type registry. Splitting into `db/connection.ts`, `db/types.ts`, `db/validate.ts` unblocks every new store.
- **`settings.value: 'any'` god-bag** — `src/core/db/validate.ts:22` declares `settings: { key: 'string', value: 'any' }`. No per-key value-type contract; ad-hoc validators in 15+ readers instead.
- **Schema migration is destructive-recreate** — `src/core/db/migrations.js`. No `_shapes` versioning, no back-fill cursor. Acceptable while no users; close window before first user-visible release.
- **Audio shells violate token-only CSS discipline** — `src/listen/AudioFullOverlay.svelte` and `src/listen/AudioMiniBar.svelte` carry inline `<style>` blocks (violates `check-no-svelte-style.mjs`) and reference 10 undefined tokens with hardcoded fallbacks (`--qa-surface`, `--qa-text`, `--qa-border`, `--qa-surface-elev`, `--qa-surface-hover`, `--qa-bottom-nav-h`). Move CSS to `src/styles/surfaces/audio.css`; map tokens to existing semantic tokens (e.g., `--qa-surface-app`, `--qa-text-default`) or declare missing ones in `src/styles/tokens/semantic.css`. Currently blocks `pnpm run validate` inside the grouped `check` gate.

## Edge cases

- **Translation ↔ riwayah alignment** — Hafs-keyed translations need `_verse-aliases.json` for Warsh / Qaloon. 7 surahs (7, 27, 36, 40, 41, 56, 57) require `'ayah-dp'` alignment method, not `'word-stream'` (`src/data/verse-aliases.ts`).
- **Reader Arabic stress-test sweep** — 3 riwayat × 5 flow steps × 3 viewports per `reference_quran_rendering_stress_test` memory. Run before promoting reader changes from `dev → staging → main`.
