# Story 2: Continuous reader + session restore | P1 | Requires: Story 1 | Blocks: Story 3

- Scroll past surah N last verse → loads N+1 seamlessly; scroll above first → loads N-1; verse-step controls on verse number tap targets; position (surah+ayah) debounce-saved (500 ms) to IDB positions["main"]
- Basmala: 1:1=counted verse; surahs 2–114=non-interactive prefix header (no verseKey, not mark-eligible); surah 9=none; 27:30=verse content; closing dua from annotations.json after 114:6 (no verseKey, not mark-eligible); sajda markers on 15 positions from annotations.json
- Orientation cue shows surah + juz, updates on boundary scroll; translation toggle (English below Arabic, default on) persists to IDB settings; launch restores positions["main"] (including closing dua state) or defaults to 1:1
- First verse render <800 ms via `performance.mark('first-verse-render')` (4× throttle, warm cache); adjacent surah prefetched in `requestIdleCallback`; Arabic ≥20 CSS px, line-height ≥1.8×; touch targets on verse numbers ≥44×44 CSS px
- IDB: positions["main"], settings (translation toggle); Cache: per-surah JSON; events: reader:scroll, reader:position-changed, reader:surah-boundary
