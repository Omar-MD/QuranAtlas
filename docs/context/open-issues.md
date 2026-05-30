# Open Issues

Known bugs, edge cases, and blocking debt. Resolve and delete the entry.

## Performance

- **Long-surah render pressure** — keep an eye on single-surah document scroll for very long Surahs. Reintroduce measured virtualization only with browser proof that deep links, bookmarks, and centered-position persistence remain stable.

## Architectural debt

- **Settings key typing** — the shared `settings` store remains a flexible key-value store. Keep per-key writers and TypeScript value contracts tight until a future migration introduces stronger persisted typing.
- **Runtime-domain boundaries** — keep checking that storage, continuity, data, packs, and UI components do not grow circular imports as React-only ownership settles.

## Edge cases

- **Translation ↔ riwayah alignment** — Hafs-keyed translations still rely on `_verse-aliases.json` for Warsh / Qalun (`qaloon`). Surahs 7, 27, 36, 40, 41, 56, and 57 require the `'ayah-dp'` alignment method.
- **Reader Arabic stress-test sweep** — run the multi-riwayah rendering sweep before promoting substantial reader changes from `dev` to `staging` or `main`.
