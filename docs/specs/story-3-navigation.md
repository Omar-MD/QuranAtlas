# Story 3: Navigation | P1 | Requires: Story 2

- Three tabs (Surah, Juz, Verse); last-used tab persisted in IDB settings; Surah tab: 114 entries with Arabic name, transliterated name, verse count, type — tap navigates to surah:1; Juz tab: 30 entries with start position (surah:ayah) — tap navigates to juz start; Verse tab: surah (1–114) + ayah inputs, ayah max bounded by surahs.json, Go button navigates to exact verse, inline validation error (not modal)
- Routes: `#/s/{surah}` and `#/s/{surah}/{ayah}`; invalid params (out-of-range) fall back to saved position; validated by input-validator.js; jumps complete <500 ms (4× throttle, warm cache)
- IDB: settings (last tab), positions (invalid deep-link fallback); events: navigation:jump
