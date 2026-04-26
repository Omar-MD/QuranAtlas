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

- Continuous verse-interleaved layout. Arabic (Uthmani script, KFGQPC fonts) on top of each verse. English translation surface is scaffolded but no translation pack ships today — toggle is present in code, ready to surface packs once they land.
- **Riwayah picker.** Three transmissions ship: Ḥafṣ ʿan ʿĀṣim, Warsh ʿan Nāfiʿ, Qālūn ʿan Nāfiʿ. Default Qālūn. Choose at first launch (onboarding screen 3) or change anytime in Settings → Reading. Each Riwayah uses its own KFGQPC font (Uthmanic script per the official Madinah Mushaf for that transmission) and its own line-height floor.
- Translation toggle (on/off) — persists across sessions.
- Four themes: **Light**, **Sepia**, **Dark**, **Auto**. Auto follows `prefers-color-scheme` — light during the day, dark at night — and flips live when the OS changes.
- Adjustable font size (slider in Settings, live preview); keyboard bindings (`⌘↑` / `⌘↓` / `0`) for quick changes.
- Chunked rendering so long surahs like Al-Baqarah stay responsive.
- Session restore: close the app and return later — lands back on the last-read verse.
- **Desktop layout (≥1180px)**: centered reader column with verses stacked Arabic-over-English; mark editor opens as a centered verse-hero modal; review hub gets a sticky 220px left rail.

### Navigation

- **Ambient dock** (floating bottom pill, 4 glyphs: Read · Search · Review · More). On the reader it fades away; tap the page to surface it. On other pages it stays pinned.
- **Ambient pill** (floating top pill) on the reader, showing the current `{surah}:{verse} · Name` and a ⌘K hint.
- **Command sheet** (⌘K or the Search glyph) — unified search across surahs, verses, tags, marks, and commands. Type a ref like `2:255` to jump straight to the verse; type `mer` to deep-link to all verses tagged `mercy`.
- **Surah directory** (`#/surahs`) — all 114 surahs with name, meaning, type, verse count; search by name/number/ref; filter by All / Bookmarked / Recent; continue-reading card at top.
- **Deep links** — every verse is addressable via `#/s/{surah}/{ayah}`; every tag via `#/t/{tag}`.

### Marks, tags, and review

- **One action surface per verse: the mark editor.** Reachable by long-press, right-click, the keyboard shortcut `m`, or "Mark this verse" from the command sheet. No contextual menu, no multi-action popover — every trigger lands on the same editor sheet.
- Multi-tag selection with a visible "Selected" strip (count + clear-all + × chips) above the tag library.
- **16 seed tags** plus **create-your-own** tags inline (type a new label → `+ create "taqwa"` chip → confirm). Each tag gets a deterministic color.
- Free-text **note** per mark.
- Delete with inline confirm + **undo toast** — miss-taps are recoverable for a few seconds.
- **Review hub** (`#/review`) — every mark with a three-segment grouping pill (Tag / Surah / Date), tag + surah filters, sort, and "load more" pagination. Cards render as a **flat deduped list** — a mark with multiple tags appears once; tags act as filters, not as groupers that duplicate the card.
- **FVR — Filtered-Verse Review** (`#/t/{tag}`) — open all verses carrying a single tag with a compact centered header (color dot, tag name, verse/surah counts). Shareable as a link.
- **Cross-tab coherence** — mark writes broadcast to other open tabs via BroadcastChannel; Clear Data in another tab prompts the live tab to reload. Everything stays consistent across browser windows.

### First-run onboarding

- **Six-screen walkthrough** on first launch: Welcome → Theme pick → Riwayah pick → Translation pick → Shortcuts primer → Tags intro.
- Progress dots; Skip available from screen 2 onward.
- Completes to Al-Fatihah or the surah directory.

### Settings

- Bottom sheet (mobile: tap gear ⚙ in `MarginHeader`; desktop: `G`+`P` shortcut or command sheet "Preferences").
- Theme swatches, Riwayah three-swatch picker, font slider with live preview, translation toggle (empty state today), Clear-all-data link.
- Clear data wipes IDB and restarts onboarding — nothing leaves the device.

### Keyboard shortcuts

Designed for keyboard-first readers. Full reference via `?` from any non-input context.

- **Universal**: `/` or `⌘K` command sheet · `?` cheatsheet · `Esc` close sheet / back from FVR.
- **"Go to" chords**: `g h` continue reading · `g s` surah list · `g r` review hub · `g a` about · `g p` preferences.
- **Reader** (on `#/s/*`): `j`/`k` next/prev verse · `]`/`[` next/prev surah · `Home`/`End` first/last verse · `m` mark the centered verse · `t` toggle translation · `+`/`-`/`0` font size · `d` cycle theme.
- **Command sheet**: `↑`/`↓` move · `Tab`/`Shift+Tab` next/prev group · `Enter` activate.

### About

- Wordmark + mission ("Read, reflect, remember.")
- Qur'an 54:17 blessing in Arabic + translation.
- 2×2 stat grid: Marks · Tags · Surahs · % Qur'an tagged.
- Attribution: Qur'an text (Hafs, Warsh, Qaloon riwayat) and Uthmanic fonts from King Fahd Glorious Qur'an Printing Complex (KFGQPC), Madinah; Amiri + Amiri Quran fonts by Khaled Hosny; Svelte, Vite, Workbox.
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
- Translations are not currently shipped — the toggle, picker, and onboarding screen 4 scaffolding remain in code, ready to surface translation packs once they land.
- Footnotes or tafsir.
- Export / import of marks.

## Learn more

- User-facing end-to-end flows: [`docs/context/user-journeys.md`](context/user-journeys.md)
- Codebase orientation: [`docs/context/architecture.md`](context/architecture.md)
- All context docs: [`docs/context/`](context/)
