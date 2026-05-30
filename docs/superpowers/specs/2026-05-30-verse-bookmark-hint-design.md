# Verse Bookmark Hint Design

## Context

QuranAtlas verse bookmarks are toggled from the verse number control in the Verse reader. The current control already mounts a bookmark glyph, but the inactive state hides it, so an unbookmarked verse reads as a passive verse number rather than an action.

The selected direction is a minimal first-use hint based on the B1 "Inline whisper" mockup from the brainstorming visual companion.

## Goal

Make verse-level bookmarking discoverable without adding persistent instructional chrome or interrupting the reading surface.

## Selected UX

Use a quiet bookmark chip for the verse number and show one inline first-use hint:

- The verse number control always shows a small outline bookmark icon beside the number.
- When the verse is bookmarked, the icon fills and the control uses the bookmark accent state.
- When the active riwayah has no verse bookmarks, the first rendered verse shows a tiny inline hint beside the verse number: `tap to bookmark`.
- The hint sits in the verse header flow. It does not float over Arabic text, translation text, or reader chrome.
- The hint has no close button.
- The hint disappears once the user toggles any verse bookmark.

## Component Shape

`VerseNumber` remains the bookmark toggle control. It should expose clear semantic labels:

- Unbookmarked: `Bookmark verse <number>`.
- Bookmarked: `Remove bookmark for verse <number>`.

`VerseBlock` or the containing verse surface decides whether a specific row should render the first-use hint. The hint should be rendered only on one verse row at a time, preferably the first rendered verse in the current Surah surface.

## Visual Treatment

The inactive control should keep QuranAtlas's calm reader style:

- Use semantic reader/bookmark tokens, not raw palette values.
- Keep the control compact and stable so bookmark state does not shift row layout.
- Render the inactive bookmark icon as an outline, low-emphasis affordance.
- Render the bookmarked state as filled icon plus accent color.
- Render the inline hint as small muted text, visually lighter than the verse number control.
- Avoid floating coachmarks, arrows, popovers, badges, or animated attention effects.

## State Rules

The design covers these states:

- No bookmarks: first rendered verse can show `tap to bookmark`.
- Unbookmarked verse: outline icon remains visible.
- Hover/focus: the control may receive a subtle surface and border treatment.
- Bookmarked verse: filled icon and accent state.
- Reduced motion: no motion is required for the hint.

## Data Flow

The hint decision should derive from existing bookmark state already available to the reader:

- If the active riwayah has no verse bookmarks, allow one hint.
- If at least one verse bookmark exists, suppress the hint.
- Page bookmarks do not need to count as verse bookmark discovery for this hint.

No new persisted preference is required for the approved minimal design. The hint naturally disappears after the first verse bookmark exists.

## Error And Edge Handling

- If bookmark state is still loading, prefer not showing the hint until the state is known.
- If bookmark toggling fails, the existing bookmark behavior should remain the source of truth; the hint should not claim success.
- The hint must not overlap Arabic text, translation text, footnote panels, metadata chips, or reader chrome at mobile, tablet, or desktop widths.

## Verification Expectations

This is UI behavior and should be verified through the smallest proof that covers the changed surface:

- Confirm the inactive verse number visibly communicates bookmark affordance.
- Confirm the first-use hint appears only when there are no verse bookmarks.
- Confirm the hint disappears after a verse bookmark is toggled.
- Confirm bookmarked styling remains visually distinct.
- Check mobile, tablet, and desktop reader widths for layout stability and no overlap.

Do not add automated tests unless explicitly requested. Existing unit or browser checks may be run as verification if implementation risk warrants it.
