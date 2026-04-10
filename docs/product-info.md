# QuranAtlas

**Read, reflect, remember.**

QuranAtlas is a distraction-free Quran reading app that works seamlessly online and offline.

## What is QuranAtlas?

QuranAtlas is a Progressive Web App designed for reading the Quran on mobile devices. It offers a focused, no-distractions reading experience with Arabic text and English translation, works without internet after you download it, and feels like a native app on your phone.

## Who is it for?

- Muslims who want a simple, beautiful way to read the Quran on their phone
- Readers who need offline access during commutes, prayers, or travel
- Those who want to track their reading progress and mark verses for reflection

## What You Get

### Reading Experience
- Clean, elegant Arabic text (Uthmani script) with proper styling
- English translation (Bridges' by Fadel Soliman) shown below each verse
- Toggle translation on or off with one tap
- Choose from 3 themes: Light, Sepia, or Dark

### Navigation
- Browse all 114 surahs with search
- Jump directly to any verse via deep links
- Resume where you left off — your reading position is saved automatically
- Quick navigation between surahs

### Marks & Review
- Mark any verse with a long-press
- Tag marks with 4 default categories: Favourite, Study, Reflection, Question
- Review all your marks in one place, grouped by surah
- Filter marks by tag or surah

### Offline Access
- Download the full Quran corpus once
- Read offline after download — no internet required
- Automatic updates when you reconnect

### PWA Install
- Add to home screen for a native app experience
- Opens without browser chrome for focused reading

## What's Included

- All 114 surahs with 6,236 verses
- Complete Bridges' English translation
- Surah metadata
- Dark, Sepia, and Light themes
- Session restore (remembers where you left off)
- Verse marking with 4 default tags
- Review hub for all your marks
- Deep linking to any verse
- Offline download and automatic updates
- Settings page (theme, clear data)
- About page (versions, attribution, storage info)

## What's NOT Included

### Not Planned

- Audio recitation
- Transliteration
- Page-based Mushaf layout
- Full-text search
- Copy ayahs to clipboard
- Multi-device sync
- Community or shared annotations
- Social sharing
- Multiple translation editions
- Analytics or usage tracking
- Footnotes or tafsir
- Export data
- Hizb or ruku navigation
- Font size controls (use browser zoom)

For items planned in future, see Future Stories.

## Implemented Stories

- **Story 1: Online reading** — Arabic + English, surah rendering, skeleton/error states
- **Story 2: Continuous reader** — chunked rendering, session restore, scroll tracking
- **Story 3: Navigation** — surah list, search/filter, keyboard nav, mobile overlay
- **Story 4: Verse marks** — long-press, tag assignment, indicators, undo
- **Story 5: Review hub** — All Marks view, grouping, filtering, sort, pagination
- **Story 6: Cross-tab safety** — BroadcastChannel sync, IDB versionchange banner
- **Story 7: Deep links** — verse-level URLs, invalid verse handling
- **Story 8: Dataset updates** — version check, download, staging, SHA-256 verify, apply
- **Story 9: Settings & About** — theme switcher, clear data, versions, attribution, PWA install

## Future Stories

- Custom tag creation
- Filtered Verse Review (FVR)
- BroadcastChannel cross-tab sync enhancements
- Bulk mark operations

## Critical User Journeys

1. Launch → default surah → read
2. Navigate → search surah → select → read
3. Read → scroll → close → reopen → resume position
4. Read → Arabic + English text renders correctly
5. Long-press verse → tag → indicator → review hub
6. Toggle translation → navigate → persists
7. Switch theme → reload → persists
8. Deep link `#/s/2/255` → correct verse
9. SW registration → cache → offline ready
