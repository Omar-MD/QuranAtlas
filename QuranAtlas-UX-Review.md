# Quran Atlas — combined UX critique and redesign recommendations

Site: [dev.quranatlas.org](https://dev.quranatlas.org/) · Inspection: 12 September 2026 · Source verification: 12 September 2026 against the current working tree

**The main problem is interrupted reading: setup before content, excessive verse spacing, hidden controls, and Mushaf control-recovery layouts. Fix those before decorative polish.** The desired conversion is starting and continuing a comfortable reading session.

**Scope update (13 September 2026): the Search product is removed.** Search is being deleted end to end — route, engine, worker, packs, saved searches, the drawer's Read/Search destination switch, and the reader "Search Quran" action — per the removal plan at `.scratch/agent-work/search-removal/tasks/removal-plan--codex--primary/plan.md`. Search findings below are retained as evidence but are resolved by removal, not redesign; all remaining redesign work is reader-only. The lightweight surah-name/number/verse-reference filter in the surah list is preserved as navigation, not a search surface. Phase 2 drops its search-architecture item, Phase 3 drops its search-results item, and Phase 4 drops the search re-tests; multi-verse passage grouping and reference/numbering conventions remain in reader scope.

## Scope and evidence

This report combines direct desktop inspection at 1,363 × 936 with the independent review supplied as **Pasted text.txt**, which reports desktop and mobile inspection at 390 × 844. Repeated findings are merged; disagreements are resolved below. This report supersedes the earlier reviews.

Direct inspection covers onboarding, Verse view, both Mushaf editions, single-page and Scroll settings, navigation, settings, About, and a search for “mercy.” Findings describe the development build, not production analytics or user-study results.

**Evidence distinction:** unqualified observations below come from direct inspection; independent-only observations are explicitly attributed. Mobile findings come from the supplied review, whose original mobile screenshots and recordings were not included. This browser exposes no supported mobile viewport or touch emulation. Native swipes, pinch zoom, browser-bar resizing, virtual keyboards, and mobile animation performance remain unverified here.

**Source verification pass (12 September 2026).** Every finding was checked against the current working tree (`src/**`, `data/catalog/**`). Claims contradicted by current source were removed and are listed under *Reconciliation → Removed after source verification*. Claims confirmed in source carry file references. Runtime-only behaviours (pixel measurements, gesture timing, live search results) remain inspection claims and are flagged for the Phase 4 device pass. Notable landed work since inspection: reader verse anchoring and edition-transition fallbacks (`ad81145`), a persistent pack downloader with progress and pause/resume (`6fc52ed`), paginated search with previews and evidence lanes (`542fdb6`), uncached Mushaf page rendering (`52eb03a`), distinct chrome icon semantics (`d0c21d8`), and a settings Mushaf-edition switcher (`5d1aed2`).

## Current progress — Codex reassessment (15 September 2026)

This is a current-tree status update, not a claim that the original review's remaining device gates have passed. The working tree contains uncommitted repairs in `src/components/reader/MushafPageViewer.tsx`, `src/app/routes/settings/SettingsRoute.tsx` and `src/design-system/index.css`, plus updates to this report. `mise run check` passes (Biome and TypeScript). The broader `mise run validate` run passed release build, 41 core smoke tests (1 skipped) and all 10 offline-lifecycle tests, but stopped at `data:check` because existing generated `public/dataset` contains extra Furatiyyah page outputs; those generated assets were left untouched.

| Finding | Current status | Evidence from this reassessment |
|---|---|---|
| MUSHAF-001 — Quran.ws Scroll mode did not provide a scrollable reading surface | **Fixed in the current working tree** | Built-in @Browser at 390 × 844 and 1,440 × 900: the stage has `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight > clientHeight`, and `scrollTop` changes after scrolling. The remaining gate is real-device gesture/rotation coverage. |
| MUSHAF-002 — Furatiyyah Full page / Reading fit collapsed to tiny or blank image cards | **Fixed in the current working tree** | Built-in @Browser at both mobile and desktop sizes: Full page and Reading fit render a complete image with non-zero dimensions; mobile image natural size was 2,136 × 2,720 and its rendered size was 340 × 432.95. |
| MUSHAF-003 — Quran.ws settings preview rendered black | **Fixed in the current working tree** | Built-in @Browser shows an actual inline SVG preview with accessible name “Preview of page 3”; the preview is visible and no external `<img>` is used for the inline edition. |
| Phase 3 A1 — legacy `sm` / `lg` reading-flow values | **Fixed in source and the existing e2e handoff** | The settings writer normalizes legacy values to `xs` / `xl`; retain this as a regression check rather than an open defect. |
| Phase 3 A2 — current surah hidden from the selector's accessible name | **Fixed and manually verified** | The live selector announces `Al-Fātiḥah — Choose surah` (and the analogous current-surah label on Al-Baqarah). |
| Phase 3 A3 — overlapping Night mode and Theme controls | **Fixed and manually verified** | Settings exposes Light/Sepia/Dark/System and a separate “Dim page images” switch; no Night mode radio group remains. |
| Surah filter `2:142` row activation | **Fixed and browser-verified (15 September 2026)** | Root cause: the reader surah selector's row activation used only the recent-position verse and ignored the typed reference. `SurahSelector.tsx` now prefers the parsed reference for the matching surah (verse-count guarded), and out-of-range refs such as `2:999` show "No surah matches" like the Surahs page. Verified: `2:142` row click reaches `#/s/2/142` with the verse in view (selector, verse and mushaf modes, and the Surahs page); `2:255` reaches `#/s/2/255` instead of the stale recent verse. |

The browser evidence uses simulated viewports, not a physical phone or native touch input. A clean origin was used for the final pass; an earlier contaminated multi-tab run produced an IndexedDB upgrade-blocked warning and is not treated as a product finding. Juz-to-printed-page metadata remains a documented mapping caveat, not a confirmed navigation failure.

Severity: **Critical** blocks a core task or materially undermines reference confidence; **Important** significantly harms clarity or comfort; **Nice-to-have** improves polish after core fixes. Effort estimates are directional.

## Pass 1 — skeptical first-time visitor

The five-second impression is “choose a technical edition,” rather than “start reading.” The Quran context is recognisable, but the edition differences, search capability, and immediate benefit are not apparent.

| Severity | Finding | Concrete fix |
|---|---|---|
| Critical | A setup flow precedes any passage. The app renders onboarding before the reader is ready (`src/App.tsx:176-225`); the edition chooser pre-selects the first option and enables Continue, so it is a confirmation gate rather than an informed choice. | Present a readable passage immediately, with the selected edition clearly labelled and changeable. If explicit edition selection is essential, use one compact chooser containing previews and a direct Start reading action. |
| Important | “Qalun Quran.ws” and “Qalun Furatiyyah 2023” (exact current labels, `data/catalog/mushaf-assets.json`) provide no useful comparison; the only support copy is “Select the edition you want to use for your reader.” (`OnboardingRoute.tsx:391-394`). | Show the same regular text page in each edition, source/publisher, year where relevant, and a one-line visual description. State current Qalūn support clearly. |
| Important | The offline download offer appears after edition setup but before any reading (`launch-restore.ts:117-140`). Pack sizes derive from the asset index `totalBytes`; 405.4 MiB is confirmed for the tracked Quran.ws index (`data/catalog/mushaf-asset-index.json`), while the second edition's size is not verifiable from tracked data. | Move the optional page download offer after reading starts or into Downloads. Distinguish saved reader text from downloadable page images. |
| Important | The reader introduction consumes roughly half the first desktop viewport. Previous-surah navigation wraps surah 1 to surah 114, so “Previous surah: An-Nās” appears before Al-Fātiḥah (`ReaderVerseSurface.tsx:79-90`, `data/surah-index.ts:40-42`). | Compress the heading and basmala area. Place adjacent-surah navigation after the passage or inside the surah selector. Do not offer backward navigation at the very beginning of the book. |
| Important | Search requires opening the navigation drawer while secondary toolbar icons appear immediately in reader chrome. The drawer now exposes labelled Read/Search segmented destinations (`NavDrawer.tsx:320-333`), but the reader header itself is a non-interactive title span plus menu/settings/toggle icons (`ReaderChrome.tsx:30-77`). | **Resolved by removal:** Search leaves the product and the drawer's destination switch with it. The surviving fix is reader-only: make the current surah a discoverable selector. Keep daily reading plans secondary to starting a passage. |

### Hero and entry copy

There is no conventional marketing hero in the inspected first-visit flow. “Choose your Mushaf edition” is a setup instruction (current strings verified: heading “Choose your Mushaf edition,” button “Continue,” no passage preview — `OnboardingRoute.tsx:391-434`); its supporting sentence repeats the task; “Continue” does not name the outcome.

Use a compact introduction with an actual passage preview:

- **Headline:** Read the Quran with clarity.
- **Subheadline:** Read in Qalūn, follow the English translation, and find verses.
- **Primary action:** Start reading
- **Edition control:** Qalūn · Change edition

For returning readers, prioritise Resume reading with a named surah and location. Do not force a repeat welcome screen. Avoid “instant search,” “small download,” or absolute privacy promises unless verified.

## Pass 2 — reader layout and visual design

| Severity | Finding | Concrete fix |
|---|---|---|
| Critical | Verse blocks span very wide. A centred column now exists but caps at 1,080 px (`src/design-system/index.css:849-852`); short Arabic lines still sit far right while translations begin far left across a large empty field. | Narrow the Verse-view column to 720–800 px. Keep each Arabic passage and its translation in a compact group. Test 16–24 px between languages and 32–40 px between verses. |
| Important | The basmala dominates while sustained verse text and English translation feel comparatively small. Current defaults: Arabic 1.875 rem against translation 1 rem (`index.css:127-144`). | Test Arabic at 32–36 px and translation at 18 px on desktop, with separate size controls. Tune Arabic line height against dense diacritics and long verses. These values are starting points, not measured accessibility thresholds. |
| Important | The header and body repeat the surah name: the body renders an Arabic heading plus an English metadata line (`ReaderVerseSurface.tsx:89-101`) while the shell header carries the same label (`ReaderPageShell.tsx:120-127`). | Keep the Latin name in the header; retain an Arabic body heading and one metadata line. Remove redundant naming where the header already orients the reader. |
| Important | Light already looks sepia. Verified tokens: canvas `#fbf8f0`, text `#2d2820` (both warm), selection a 22% accent color-mix (`semantic.css:3-30`). | Give Light a neutral off-white canvas, near-black text and distinct white panels. Reserve cream for Sepia. Use one accent; pair selection colour with a checkmark or border. Verify contrast before adopting final colours. |
| Important | Controls mix embossed circles, pale rectangles and weak segmented selections; inset shading persists in nav/control recipes (`index.css:622, 1386-1387`). | Standardise solid primary, outlined secondary and plain icon treatments. Use consistent icon weight, approximately 8 px control corners and 44 px hit areas. Remove decorative inset shading. |
| Important | Icon-only controls rely on unfamiliar glyphs. The Verse/Mushaf toggle now carries a tooltip and accessible name (`ReadingViewToggle.tsx:10-31`) and Daily Wird is labelled in settings, but glyphs still do not explain themselves to sighted first-time users. | Use a labelled Verses / Mushaf toggle. Give other icons desktop tooltips and accessible names; introduce Daily wird as a daily reading portion or plan. |
| Important | The navigation drawer overlays the reader (a scrim now exists — `overlays.tsx:148-155` — but content does not reflow) and compresses four destinations into one row. The “Bookm…” truncation is resolved in source: the full Bookmarks label renders (`NavDrawer.tsx:374-381`). | Use a desktop sidebar that reflows the reader, or a clearly modal drawer. Standardise header, close control and background treatment. Give Bookmarks a separate row instead of compressing four destinations. |
| Important | The verse number doubles as the bookmark target, with “tap to bookmark” attached to the first verse (`VerseNumber.tsx:17-40`, `VerseBlock.tsx:85-93`). | Keep the reference readable and stable; provide a distinct bookmark action with a clear selected state. Make help dismissible and equally understandable for mouse and touch. |

**Important — the typography hierarchy needs clearer roles.** About identifies Newsreader for Latin text, system UI type and KFGQPC Arabic fonts (verified: `@font-face` Newsreader + KFGQPC Hafs/Warsh/Qaloon, `index.css:8-67`; `AboutRoute.tsx:29-30`). The independent review's “default-Georgia” description is an aesthetic impression, not a verified font identification. Keep one UI face, a deliberate translation face and the edition-appropriate Arabic type. Use upright text for sustained translation; reserve italics for short supporting material. The direct inspection does not establish that all translations are italic.

**Important — reduce ornamental interface framing.** Both reviews identify too many nested boxes and inconsistent control emphasis. Use restrained 1 px dividers, modest card corners (start at 12 px), and one subtle overlay shadow. Do not lower control-boundary contrast merely to meet an arbitrary opacity target. Exact 2 px borders and “deep black” shadows from the independent review are not verified measurements.

Sharpness is principally a hierarchy and component-consistency problem in the inspected app interface. No high-DPI source-resolution audit was completed; do not assume all Mushaf image assets are blurred or require replacement.

## Reader scrolling and controls — direct tests

| Test | Observed result | Assessment and fix |
|---|---|---|
| Verse view: scroll down 610 px, then up 155 px | Scroll position changes from 830 to 1,440 to 1,285 px. Toolbar hides on downward movement and returns on upward movement. | Behaviour works in this desktop test. **Important:** document a consistent reveal rule across reading modes and provide an accessible persistent route to controls. |
| Verse view: open and close Settings | Position remains at 1,285 px. | Preserve this behaviour. Font changes, edition changes, rotation and reload still need separate position-retention tests. |
| Mushaf: hidden controls | Escape reveals the top toolbar and a bottom strip containing previous/next, page number and bookmark (verified: `MushafPageViewer.tsx:257-261, 517-570`). | **Important:** controls exist but recovery is undiscoverable. Explain it once; offer an explicit Focus mode and a visible reveal target. Escape must not be the only learnable recovery path. |
| Mushaf: reveal controls over Furatiyyah page | Top and bottom bars overlay the printed page; the bottom strip is absolute-positioned over the page surface (verified: `index.css:2481-2499`). | **Important:** reserve space or refit the page when controls appear. Printed notes and page numbers must remain accessible. |

**Confirmed fixed in the current working tree (browser QA completed; device regression still required):** MUSHAF-001's missing Scroll owner, MUSHAF-002's Furatiyyah Full page/Reading fit collapse, and MUSHAF-003's black Quran.ws settings preview now pass the mobile and desktop @Browser checks recorded above. The scroll stage is the owner with `overflow-y: auto`; Furatiyyah images retain non-zero natural and rendered dimensions; inline Quran.ws SVG previews render visibly. Keep the real-device gate for gesture, rotation, safe-area and loading-anchor coverage before closing these items.

The independent review additionally reports that tapping the Mushaf page reveals controls. Retain that convenient action, but teach it and provide a visible alternative. A transient partial toolbar position during animation alone is not proof of a broken transition; persistent peeking or repeated toggling during small scroll movements is the defect to reproduce.

## Both Mushaf editions

| Aspect | Quran.ws | Furatiyyah 2023 |
|---|---|---|
| Appearance | Monochrome, minimal framing | Decorative borders, coloured notation and printed marginal notes |
| Space use | Less ornament around the passage | A wide side strip and decorative frame reduce usable text area |
| Offline page download | 405.4 MiB (verified in tracked asset index) | Size not verifiable from tracked data; confirm from the built pack plan |
| Controls observed | Single/Scroll and Fit width | Single/Scroll, Fit width, Full page/Text focus and a text-size slider |
| Main viewer requirement | Stable page scale and readable continuous layout | Stable fitting, preserved notation colours and accessible printed annotations |

- **Important — Edition controls need clear consequences.** Current labels verified: Fit width, “reviewed frame width,” Full page/Text focus, Single/Scroll (`MushafSettings.tsx:45-63`, `MushafModeControl.tsx:19-21`). Replace “reviewed frame width” with plain language. Label image magnification as Zoom or Text area size; distinguish it from Verse-view font size. Show a preview of Full page versus Text focus.
- **Important — Default framing wastes space in Furatiyyah.** Improve the existing Text focus control and fitting defaults rather than adding a duplicate feature. Exclude only blank margins; retain a Full page option for notes and original layout. Text-focus quality in working Single mode remains unverified.
- **Important — Page colours and app colours have different roles.** Use a neutral surrounding interface and preserve the publisher’s printed colours. Do not apply global image recolouring without checking every notation colour. Dark/Night image treatment remains untested.
- **Important — Coloured notation lacks a visible explanation in the inspected reading surface.** Provide an edition-specific guide using the publisher’s documentation, with text explanations that do not depend on distinguishing green/brown or other colours.
- **Nice-to-have — Quran.ws could use a clearer page boundary.** A subtle page surface and deliberate outer margin can make the minimal edition feel intentional. Heavy ornament is optional. Preserve original page content; do not invent surah decoration or add a second basmala. The basmala was visible in the direct page-1 inspection.

## Settings, navigation and copy

| Severity | Finding | Concrete fix |
|---|---|---|
| Important | Settings mixes frequent reading adjustments with downloads and technical inventory. Current order verified: mode panel → Reading continuity → Appearance → Mushaf edition → Offline reading data → Included reading assets (`SettingsRoute.tsx:156-181`). | Order controls by task: text/page layout, translation, appearance, edition, downloads. Move inventory to About → Sources. Keep a preview visible while adjusting reading. |
| Important | Verse settings and Mushaf settings expose different reading controls but repeat shared preferences (verified: `VerseSettings.tsx`, `MushafSettings.tsx` under one shell). The independent review flags a fragmented mental model. | Use one consistent Settings shell and order. Change only the Reading section for the current view; keep Appearance, Edition and Downloads in stable locations. Context-sensitive options are appropriate and do not themselves prove duplicated implementation. |
| Important | Theme and Night mode overlap conceptually: separate Theme (Light/Sepia/Dark/Auto) and Night mode (Off/On/Auto) controls verified (`ThemeNightControls.tsx:21-32, 45-71`). The observed Auto wrap is a runtime layout claim pending device verification. | Use one theme selector with a clear system-following option. If image night treatment is separate, name and explain it separately with a preview. |
| Important | Repeated captions and nested bordered cards make settings look like a form-heavy administration panel (structure verified; visual weight is a runtime judgement). | Use quiet section headings, simple dividers and one label per control. Give controls consistent alignment and widths. |
| Important | Offline inventory actions remain terse: “Download” and “Remove” (verified, `OfflineDataSection.tsx`), now backed by an explicit removal dialog; the two sit together only in state-dependent layouts. | Use Remove download and Download pages. Separate storage management from frequent reading controls. State that removal affects offline availability; never imply it deletes notes or bookmarks unless it actually does. Reserve irreversible-data confirmation for genuinely destructive actions. |
| Nice-to-have | “Reading flow” offers Compact, Tight, Standard, Spacious and Wide (verified: `VerseSettings.tsx:7-12`); several choices are hard to distinguish. | Use Verse spacing with Compact / Comfortable / Spacious, illustrated by a preview. |
| Nice-to-have | Implementation language persists: “active reading profile” (IncludedAssetsSection description), “Included reading assets,” “Fetch latest app” (`AboutRoute.tsx:83`) and “Daily Wird” (`SettingsRoute.tsx:235-238`). “Typed evidence” no longer appears in source. | Use Sources used, Current edition, Texts and editions, and Check for updates. Explain Daily wird once as a daily reading plan. |

Theme swatches should share one layout and selection treatment, with a visible checkmark. Label any separate night-dimming behaviour by its effect, not only On/Off sun and moon icons. A wrapping Auto option is an Important layout defect if reproduced on devices; it does not establish that theme switching itself is broken.

## Trust, references and attribution

Search findings in this section are **resolved by removal** (see the scope update at the top): the Search surface leaves the product, so no search redesign is scheduled. The trust findings — numbering conventions, passage copy, attribution, privacy — remain in reader scope.

| Severity | Finding | Concrete fix |
|---|---|---|
| Important | Searching “mercy” opened an Answer preview containing no answer or verses, only Evidence only, Mixed and evidence metadata. The preview lane now supports verse evidence cards, “Show all matches,” and Open-in-Reader actions (`SearchAnswerPreview.tsx:124-149, 193-220`); the live “mercy” result content needs a runtime re-test before this stays Critical. | **Resolved by removal.** |
| Important | The empty search screen exposes Overview, Verses, Explore, Sources and disabled Save search before any query (verified: `SearchWorkspace.tsx`, `SearchHeader.tsx:57`, `SearchOverview.tsx:9-12`). | **Resolved by removal.** |
| Important | Results stretch across the desktop, have no obvious visible match emphasis in the sample, and use an arrow-only action for opening the reader (action verified: `SearchResultCard.tsx:23-28`; width/emphasis are runtime claims). | **Resolved by removal.** |
| Critical | Reference systems differ without sufficient explanation: Furatiyyah page 3 begins at verse 2:5 in the app's mapping (verified: `data/catalog/mushaf-editions/qalun-furatiyyah-2023-v1/page-start-review.json`) while the printed page marker says 6. Search result mapping aliases Hafs references to Qalūn equivalents (`src/search/result-mapping.ts:34-77`) with no user-facing explanation. | State each numbering convention, expose equivalent references, and verify mapping for reading, copying and bookmarks. A reference difference is not itself proof of incorrect Qur’anic text. |
| Important | Al-Fātiḥah includes “↑ continued from the previous Hafs-keyed verse” as translation-facing copy (verified: `VerseBlock.tsx:103-105`). | Present translations spanning multiple verses as clearly labelled passage groups, with a brief numbering explanation available on demand. Remove internal database vocabulary from the reading line. |
| Important | About names text and translation sources but mixes attribution with framework names (verified: “Built with React, Vite, and Workbox” alongside credits, `AboutRoute.tsx:33, 90-112`). | Provide direct source/publisher links, edition details, translation identification, numbering documentation and a Report an issue route. Technical build details can remain secondary. |

**Important — privacy needs an accurate explanation.** The independent review proposes “your reading never leaves this device.” Offline-first behaviour does not establish that claim. Review network use, analytics, sync and telemetry before writing privacy copy. Explain what is saved locally and what, if anything, is transmitted. Attribution should also be available where the reader uses it, rather than only in About or settings.

Sources for these UI observations: [Verse reader](https://dev.quranatlas.org/#/s/1), [search sample](https://dev.quranatlas.org/#/search?q=mercy), [Mushaf page 3](https://dev.quranatlas.org/#/m/3). Edition and layout selections depend on local preferences, so the page URL alone does not reproduce every state.

## Mobile findings from the independent review

The supplied review reports the following at **390 × 844**. These are external observations, not newly reproduced phone tests.

| Severity | Reported finding | Resolution and verification |
|---|---|---|
| Critical | Approximately two short verses fit per viewport; Al-Fātiḥah takes about four viewport heights. | Reduce the repeated bookmark-row, verse/translation and inter-verse gaps. Remove redundant heading space. Test Comfort and Compact presets. Do not enforce “4–5 verses per screen” by shrinking Arabic or translation; verse lengths and accessibility settings vary. |
| Important | Both Mushaf editions occupy roughly the top 40–60% of the viewport despite Fit width being on. | **Current-tree browser verification passes:** Full page and Reading fit render non-zero, aspect-ratio-preserving Furatiyyah pages on mobile and desktop. Retain the device gate for real touch, loading and notation coverage; a tall phone cannot always be filled in both axes while preserving the entire page. |
| Important | Bookmarks truncates to “Bookm…” on mobile as well as desktop. | Resolved in source: the full Bookmarks label renders in the 360 px drawer (`NavDrawer.tsx:374-381`). Re-verify on a device at 360 px with enlarged UI text before closing. |
| Important | The header appears partially visible during scroll hiding; the review reports a translateY position around −95 px with opacity 1. | Reproduce using a screen recording. Use one stable hidden endpoint, directional threshold and consistent transition. A transform-only slide can be valid; avoid flicker, persistent peeking and content shifts. |
| Important | Mushaf controls require an undisclosed tap and the revealed pager overlaps content (overlay verified in source: `index.css:2481-2499`). | Offer a one-time tap hint plus a persistent reveal affordance. Reserve a bottom safe-area zone or re-fit the page when controls show. Keep the actual page number reachable. |

## Mobile and motion acceptance checks still required

The following are requirements for validation, not additional observed bugs. No original mobile screenshots or recordings accompanied the independent review. Desktop defects should be included in a device test pass without claiming they already reproduce on phones.

| Priority | Mobile review requirement | Acceptance criterion |
|---|---|---|
| Critical | Continuous reading in both editions | At 360, 390 and 430 CSS px, Single and Scroll display readable content immediately. No blank pages, zero-width frames or unexpected mode-change jumps. |
| Critical | Scroll versus page-turn gestures | Vertical movement scrolls naturally in Scroll mode. Horizontal paging works in Single mode. A diagonal gesture does not unexpectedly turn a page; pinching or panning a zoomed page does not trigger navigation. |
| Critical | Reading-position retention | The same ayah/page remains in view after opening/closing drawers, returning from the surah list, switching modes, resizing browser chrome, rotating and reopening the app. Preserve a content anchor, not just a pixel offset. |
| Important | Thumb access and control recovery | Controls remain reachable above bottom safe areas, with at least 44 px targets. A clear reveal action exists without a keyboard. No mandatory long-press-only action. |
| Important | Drawer fit and keyboard behaviour | Titles and Close remain accessible. Only the active drawer scrolls. The surah filter input and its results remain reachable above the keyboard; closing it restores the reading position. |
| Important | Arabic and translation readability | Diacritics are never clipped; larger text wraps without horizontal overflow. Desktop column-width recommendations become width: 100% with suitable side padding. |
| Important | Furatiyyah fitting and notation | Test Full page, Text focus and zoom on opening and regular pages. Notes and verse markers remain accessible. Colour-dependent notation has a textual explanation. |
| Important | Motion and loading | No scroll-linked snapping or repeated toolbar flicker. Page images reserve their space while loading; the reading anchor does not shift. Reduced-motion mode removes unnecessary movement. Start with 150–200 ms restrained panel transitions; measure on devices rather than judging smoothness from still screenshots. |

Suggested mobile reading structure: a compact surah/location header, an explicit Verse/Mushaf switch, and a small recoverable control strip. Prefer a bottom sheet for short adjustments and a full-height panel for longer settings, with one scroll owner. These are design proposals pending device evidence.

## Reconciliation: claims not adopted unchanged

- Mushaf navigation controls are present; Escape reveals them. The issue is discoverability and page overlap, not absence.
- Fit width already exists in both Mushaf editions. Furatiyyah also exposes Text focus and a size slider. Improve and verify these controls instead of duplicating them.
- Numbering differences require attribution and mapping checks; this audit does not establish corrupted text.
- The 720–800 px column and font-size suggestions apply to Verse view, not a universal width imposed on page images.
- Neither native mobile scrolling nor animation performance is verified. Tool timeouts are not product defects.
- About exists and contains attribution. Improve its discoverability and content; do not describe it as absent.
- Quran.ws page 1 displays the basmala. The independent review's missing-basmala claim is contradicted by direct inspection.
- The observed Quran.ws page pack is 405.4 MiB, not a “small download.” Asset format and publisher provenance require verification before calling one edition vector or the other scanned.
- A minimal Mushaf does not require ornamental framing to be valid or polished. Treat page decoration as a design preference, not a Critical defect.
- Arabic right alignment and English left alignment are appropriate; excessive distance between them is the issue. Do not fix it by imposing the wrong language direction.
- “Ayah reference” is familiar terminology for much of this audience, unlike “Hafs-keyed” or “typed evidence.” Use Verse/Ayah consistently rather than removing meaningful religious vocabulary.
- The independent review's claim that Search is the only brown primary action is too broad: onboarding also has a solid brown action. The supported finding is inconsistent hierarchy, not a colour used exactly once.
- Do not infer mobile majority usage, engineering quality, code duplication or precise implementation effort from UI inspection alone.

### Removed after source verification (12 September 2026)

- **“You can keep reading while it finishes” with only “Skip for now.”** Stale: the offer screen now has “Download for offline reading” / “Skip for now,” and the downloading state offers “Continue reading” plus Pause/Resume (`OnboardingRoute.tsx:166-263`; downloader `6fc52ed`).
- **Furatiyyah Single→Scroll blank reader (zero-width container) and Quran.ws ~300 px scroll column as current defects.** No longer plausible in source; scroll-mode layout was rebuilt with width guards and centred cells (`index.css:2374-2421`, `MushafPageViewer.tsx:147-150`; `ad81145`, `52eb03a`). Moved to Phase 4 as a device regression check.
- **“Search is hidden inside navigation” as stated.** The drawer now exposes labelled Read/Search segmented destinations (`NavDrawer.tsx:320-333`). The remaining finding — search unavailable from reader chrome directly — is reworded in Pass 1; the destination switch itself leaves with the Search removal.
- **“Bookmarks truncates to ‘Bookm…’.”** The full label renders in current source (`NavDrawer.tsx:374-381`). Device re-verification retained in the mobile table.
- **Unlabelled Verse/Mushaf switch glyphs.** The toggle has a tooltip and accessible name (`ReadingViewToggle.tsx:10-31`); the finding is narrowed to glyph familiarity for sighted users.
- **Navigation without any dimming treatment.** A scrim exists (`overlays.tsx:148-155`); the finding is narrowed to overlay-versus-reflow behaviour.
- **“Verse blocks span roughly 1,000 px” implying no column.** A centred 1,080 px column exists (`index.css:849-852`); the finding is narrowed to column width.
- **Search 1:3 opening reader 1:2.** Not evidenced in current source; surah 1 mapping appears identity (`src/search/result-mapping.ts:34-77`). The verified numbering example (Furatiyyah page 3 ↔ 2:5) is retained.
- **“Typed evidence” as current copy.** No longer present in source; other implementation-language items verified and retained.

## Top five changes — impact versus effort

| Rank | Severity | Change | Impact | Estimated effort |
|---|---|---|---|---|
| 1 | Critical | Rebuild Verse-view width (1,080 → 720–800 px), type scale and spacing; remove redundant title and instruction space. | Very high across desktop and mobile reading | Low–medium |
| 2 | Critical | Replace blind first-run setup with edition previews, direct Start reading and honest download behaviour (download screen actions already improved; placement and previews remain). | High for first-time use | Medium |
| 3 | Critical | Expose numbering conventions and equivalent references; validate reader handoffs for bookmarks and copying. | High for finding and citing passages | Medium |
| 4 | Important | Unify Settings presentation and visual tokens; fix theme/night overlap, control labels and drawer behaviour. | High across the interface | Medium |
| 5 | Important | Mushaf chrome: explicit Focus mode, visible reveal target, and page refit so controls never cover printed notes or page numbers. | High for Mushaf reading comfort | Medium |

Reference validation applies to bookmarking and copying as well as the reader display in rank 3. The repaired Mushaf Scroll layouts move to Phase 4 as a device regression gate: verify at 360/390/430 px in both editions before closing. Mobile verification remains a completion gate for all five changes.

## Work sequencing

The findings above sequence into four phases. Each item cross-references its finding; effort classes are directional (S = hours–days, M = days–weeks, L = multi-week).

### Phase 1 — Quick wins (copy, labels, and small layout corrections)

Low-risk changes with no information-architecture or visual-system dependencies. Ship independently.

1. **Edition control copy** (S): replace “reviewed frame width” with plain language; label magnification Zoom / Text area size; distinguish from Verse-view font size. *Finding: Edition controls need clear consequences.*
2. **De-jargon product copy** (S): “Fetch latest app” → Check for updates; “Included reading assets” → Texts and editions; “active reading profile” → Current edition; introduce “Daily Wird” once as a daily reading plan. *Finding: implementation language in Settings/About.*
3. **Remove “Hafs-keyed” from the reading line** (S): drop “↑ continued from the previous Hafs-keyed verse” from `VerseBlock.tsx`; the labelled passage-group design lands in Phase 3. *Finding: Al-Fātiḥah translation copy.*
4. **Reading flow options** (S): reduce Compact/Tight/Standard/Spacious/Wide to Compact / Comfortable / Spacious. *Finding: Reading flow.*
5. **Offline inventory labels** (S): “Remove” → Remove download; “Download” → Download pages; keep the explicit removal dialog. *Finding: offline inventory actions.*
6. **Surah-1 backward navigation** (S): suppress Previous-surah at the start of Al-Fātiḥah instead of wrapping to An-Nās. *Finding: reader introduction.*
7. **Edition chooser support copy** (S): add source/publisher and a one-line description per edition under the existing labels. *Finding: edition comparison.*
8. **About attribution split** (S): separate text/translation sources from framework credits; add a Report an issue route. *Finding: About mixing.*

### Phase 2 — Structure, navigation, and page hierarchy

Information architecture and flow changes. Each is a design decision before implementation; several are candidates for the opt-in UI design loop (`skill://ui-design`).

1. **First-run flow** (M): replace setup-before-content with an immediately readable passage or a compact chooser with edition previews and a direct Start reading action; add the hero/entry copy from Pass 1. *Findings: mandatory setup, hero and entry copy.*
2. **Download offer placement** (S–M): move the offline page download offer after reading starts or into Downloads; the background-continue behaviour already exists. *Finding: download offer before reading.*
3. **Navigation model** (M): make the surah title a selector; decide drawer-overlay versus reflowing sidebar; give Bookmarks its own row. Search leaves the product (removal plan); reader chrome carries no search action and the drawer keeps reader destinations only, with no destination rail. *Findings: drawer behaviour.*
4. **Settings architecture** (M): one shell with task ordering (text/page layout → translation → appearance → edition → downloads); consolidate Theme and Night mode into one selector with a system-following option; quiet section headings. *Findings: settings order, fragmented model, theme/night overlap, form-heavy presentation.*
5. **Reader intro hierarchy** (S–M): compress heading/basmala block; place adjacent-surah navigation after the passage or inside the surah selector; remove redundant naming. *Findings: reader introduction, repeated surah name.*
6. **Search architecture** — **removed from scope.** The Search product is deleted end to end (removal plan); no search redesign is scheduled. *Findings: empty search screen, answer preview — resolved by removal.*
7. **Numbering conventions** (M): state each reference system, expose equivalent Hafs/Qalūn references in the reader, and document the mapping in About → Sources. *Findings: reference systems, mapping explanation.*
8. **About restructure** (S–M): sources/publisher links, edition details, translation identification, numbering documentation; technical build details secondary. *Finding: About.*

### Phase 3 — Visual implementation and redesign

Rendered-surface redesign, implementing the Phase 2 structures. All theme/control changes go through the design-token layer and the UI design loop; verify contrast before adopting final colours. Reader-only scope: the former search-results item is removed with the Search product.

1. **Verse-view reading column** (M): narrow 1,080 → 720–800 px; Arabic/translation grouping at 16–24 px; inter-verse 32–40 px. *Finding: verse block width.*
2. **Type scale** (M): Arabic 32–36 px and translation 18 px starting points with separate size controls; diacritic-safe line heights; finalise the Newsreader / system-UI / KFGQPC role split with upright sustained translation. *Findings: type sizes, typography hierarchy.*
3. **Light theme neutrality** (S–M): neutral off-white canvas, near-black text, distinct white panels; cream reserved for Sepia; one accent; selection paired with checkmark/border. *Finding: light theme sepia cast.*
4. **Control standardisation** (M): solid primary / outlined secondary / plain icon; consistent icon weight; ~8 px control corners; 44 px targets; remove inset shading; one overlay shadow; 1 px dividers; 12 px card corners. *Findings: control mix, ornamental framing.*
5. **Labelled view switching** (S): Verses / Mushaf labelled toggle; desktop tooltips on icon controls. *Finding: unfamiliar glyphs.*
6. **Bookmark action** (S–M): distinct bookmark control with clear selected state, separate from the verse number; dismissible help for mouse and touch. *Finding: verse number as bookmark target.*
7. **Mushaf chrome** (M): explicit Focus mode; visible reveal target plus the existing tap/Escape; refit the page or reserve space when controls appear; keep printed notes and page numbers reachable. *Findings: hidden controls, control overlay.*
8. **Edition viewer controls** (M): previews for Full page versus Text focus; improved Text-focus defaults for Furatiyyah; neutral surrounding interface preserving printed colours; edition-specific notation guide. *Findings: edition controls, Furatiyyah framing, notation guide.*
9. **Passage-group labelling** (S–M): present translations spanning multiple verses as clearly labelled passage groups, with a brief numbering explanation available on demand; no internal database vocabulary in the reading line. *Findings: Al-Fātiḥah translation copy, passage grouping.*
10. **Mobile reading density** (M): compact surah/location header; reduced inter-verse and heading gaps; bottom-sheet adjustments with one scroll owner; Mushaf fitting at phone aspect ratios. *Findings: mobile table.*
11. **Quran.ws page boundary** (S, nice-to-have): subtle page surface and deliberate outer margin without inventing ornament.

### Phase 4 — QA and acceptance

Verification gates. No phase above is complete until its relevant checks here pass.

1. **Mushaf scroll regression** (device gate after current-tree fix): both editions, Single ↔ Scroll, at 360/390/430 CSS px and desktop; no blank pages, zero-width frames, or mode-change jumps; confirms the @Browser-verified MUSHAF-001/MUSHAF-002/MUSHAF-003 fixes hold on devices. *Resolved-findings note.*
2. **Mobile acceptance matrix** (Critical): run the full *Mobile and motion acceptance checks* table on devices — gestures (scroll vs page-turn vs pinch), reading-position retention across drawer/mode/rotation/reopen, thumb reach and safe areas, keyboard behaviour, diacritic clipping, Furatiyyah notation.
3. **Reference-mapping validation** (Critical): verify Hafs/Qalūn equivalence display and mapping correctness across reading, bookmarks and copying; confirm the Furatiyyah page-start mapping against printed markers.
4. **Runtime re-tests of inspection claims** (Important): Auto-theme row wrap; header hide endpoint (−95 px peek claim); Bookmarks label at 360 px with enlarged text. (The search answer-preview and result-emphasis re-tests are dropped with the Search removal.)
5. **Accessibility pass** (Important): contrast verification for new tokens; 44 px targets; focus-visible rings; renamed controls announced correctly; reduced-motion removes non-essential movement. The current-surah selector naming is fixed; retain it as a regression check.
6. **Privacy copy gate** (Important): audit network use, analytics, sync and telemetry before writing any privacy claim; publish the local-storage versus transmission explanation.
7. **Performance and loading** (Important): page images reserve space while loading; reading anchor stability; panel transitions at 150–200 ms measured on devices.
8. **Offline lifecycle** (Critical): the retained offline Playwright suite plus the pack downloader pause/resume/skip paths, both editions.
9. **Surah verse-reference filter activation** (Important): ~~selecting a filtered `2:142` result must navigate to the verse target just as pressing Enter does; retain the current inconsistency as an open item until the row action is corrected and browser-tested.~~ **Closed 15 September 2026:** the reader selector row now honours the typed reference and the out-of-range guard matches the Surahs page; browser-verified on both surfaces and both reader modes (see the progress table and `.scratch/agent-work/ux-review-phase-4/tasks/surah-ref-fix-qa--zcode--claude/`).
