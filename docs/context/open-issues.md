# Open Issues

Known bugs, edge cases, and blocking debt. Resolve and delete the entry.

## Performance

- **`reshape()` MutationObserver walks every chunk-appended node** — `src/app-bootstrap.ts` triggers per-node reshape via `font-reshape.ts::reshapeAddedNodes`. Hot path during long-surah scroll; scope it to the appended chunk root.

## Architectural debt

- **`settings.value: 'any'` god-bag** — `src/core/db/validate.ts` still treats the shared `settings` store as an untyped value bag, so many per-key contracts live outside the central schema.
- **Remaining runtime-domain import allowances** — the Reader First import guard still carries a few explicit direction allowances where runtime/data modules reach configure-owned helpers. Those should be retired as the shared domains settle.

## Edge cases

- **Translation ↔ riwayah alignment** — Hafs-keyed translations still rely on `_verse-aliases.json` for Warsh / Qalun (`qaloon`). Surahs 7, 27, 36, 40, 41, 56, and 57 require the `'ayah-dp'` alignment method.
- **Reader Arabic stress-test sweep** — run the multi-riwayah rendering sweep before promoting substantial reader changes from `dev` to `staging` or `main`.
