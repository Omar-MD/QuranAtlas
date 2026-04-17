# QuranAtlas

**Read, reflect, remember.**

QuranAtlas is a distraction-free, offline-first Qur'an reading app. It offers continuous verse-interleaved reading with Arabic (Uthmani) and English translation, personal verse marks with custom tags, and ambient navigation that gets out of the way while you read.

This is the product overview. For implementation detail, see `docs/context/` (architecture, feature-map, module-graph, events, data-model, user-journeys).

## Who is it for?

- Muslims who want a focused, uncluttered way to read the Qur'an on their phone or laptop.
- Readers who need reliable offline access — commutes, travel, prayer times with no signal.
- Students who mark verses by theme (mercy, patience, tawakkul, etc.) and revisit them grouped by tag.

## What you get

### Reading experience

- Continuous verse-interleaved layout. Arabic (Uthmani script via KFGQPC) on top of each verse, English translation (Bridges' by Fadel Soliman) underneath.
- Translation toggle (on/off) — per-session preference, persists across reloads.
- Four themes: **Light**, **Sepia**, **Dark**, **Auto**. Auto follows `prefers-color-scheme` — light during the day, dark at night — automatically.
- Adjustable font size (slider in Settings, live preview).
- Chunked rendering so long surahs like Al-Baqarah stay responsive.
- Session restore: close the app and return later — lands back on the last-read verse.

### Navigation

- **Ambient dock** (floating bottom pill, 4 glyphs: Read · Search · Review · More). On the reader it fades away; tap the page to surface it. On other pages it stays pinned.
- **Ambient pill** (floating top pill) on the reader, showing the current `{surah}:{verse} · Name` and a ⌘K hint.
- **Command sheet** (⌘K or the Search glyph) — unified search across surahs, verses, tags, marks, and commands. Type a ref like `2:255` to jump straight to the verse; type `mer` to deep-link to all verses tagged `mercy`.
- **Surah directory** (`#/surahs`) — all 114 surahs with name, meaning, type, verse count; search by name/number/ref; filter by All / Bookmarked / Recent; continue-reading card at top.
- **Deep links** — every verse is addressable via `#/s/{surah}/{ayah}`; every tag via `#/t/{tag}`.

### Marks, tags, and review

- Long-press any verse to open the **mark editor** (bottom sheet). No contextual menu, no alternative gesture — one path, always.
- Multi-tag selection with a visible "Selected" strip (count + clear-all + × chips) above the tag library.
- **16 seed tags** plus **create-your-own** tags inline (type a new label → `+ create "taqwa"` chip → confirm). Each tag gets a deterministic color.
- Free-text **note** per mark.
- Delete with inline confirm + **undo toast** — miss-taps are recoverable for a few seconds.
- **Review hub** (`#/review`) — every mark with a three-segment grouping pill (Tag / Surah / Date), tag + surah filters, sort, and pagination. Multi-tagged marks appear under each tag.
- **FVR — Filtered-Verse Review** (`#/t/{tag}`) — open all verses carrying a single tag with a compact centered header (color dot, tag name, verse/surah counts). Shareable as a link.
- **Cross-tab coherence** — mark writes broadcast to other open tabs via BroadcastChannel; everything stays consistent across browser windows.

### First-run onboarding

- **Four-screen walkthrough** on first launch: Welcome · Theme pick · Translation pick · Tags intro.
- Progress dots; Skip available from screen 2 onward.
- Completes to Al-Fatihah or the surah directory.

### Settings

- Bottom sheet (opened from the dock's ⋯ More menu → Settings).
- Theme swatches, font slider with live preview, translation toggle and picker, Clear-all-data link.
- Clear data wipes IDB and restarts onboarding — nothing leaves the device.

### About

- Wordmark + mission ("Read, reflect, remember.")
- Qur'an 54:17 blessing in Arabic + translation.
- 2×2 stat grid: Marks · Tags · Surahs · % Qur'an tagged.
- Attribution (Bridges' translation, KFGQPC Arabic, Scheherazade New font, Vite/Lightning CSS/Workbox).
- Install-app CTA (when the browser's install prompt is available) and the app version.

### Offline

- Service worker caches the full Qur'an corpus (all 114 surahs, 6,236 verses) on first online use.
- Subsequent launches work fully offline — reader, command sheet, marks, review hub, everything.
- Dataset updates are fetched in the background, verified by SHA-256, and promoted atomically.
- PWA install: add to home screen for a full-screen, native-feeling experience.

### Privacy

- Everything lives in IndexedDB on the user's device.
- No sync, no tracking, no analytics, no backend. Clearing data is one tap and wipes everything.

## What's NOT included

Deliberately out of scope — not on the roadmap unless that changes:

- Audio recitation.
- Transliteration (Latin-letter Arabic).
- Page-based Mushaf layout (juz/hizb/ruku navigation).
- Full-text search across all 6,236 verses.
- Copy-verse-to-clipboard or social sharing.
- Multi-device sync or accounts.
- Community features, shared annotations, public libraries.
- Multiple active translation *editions* — the picker exposes four options (Saheeh, Pickthall, Yusuf, Khattab) and persists the selection, but only Bridges' translation currently ships in the dataset. Additional translations are future work.
- Footnotes or tafsir.
- Export / import of marks.

## Learn more

- User-facing end-to-end flows: [`docs/context/user-journeys.md`](context/user-journeys.md)
- Codebase orientation: [`docs/context/architecture.md`](context/architecture.md)
- All context docs: [`docs/context/`](context/)
