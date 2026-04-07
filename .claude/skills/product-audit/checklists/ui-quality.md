# UI Quality — Core Checklist

**Weight: 3** | **Version: 3** | **Items: 18**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

> **Severity guidance for this dimension:** Most UI Quality findings are P2 (degrades experience) or P3 (improvement opportunity). A finding can only reach P1 if an accessibility barrier completely prevents a user from reaching content (e.g., keyboard trap that blocks navigation to a surah). P0 is extremely rare for this dimension — only if an accessibility failure causes wrong verse text to be read by a screen reader.

### Accessibility

1. **Semantic HTML structure** — All interactive elements use semantic tags (`<button>`, `<nav>`, `<main>`, `<header>`, `<dialog>`). No `<div>` or `<span>` used as buttons or links. Landmarks (`<main>`, `<nav>`, `<header>`) define page regions for assistive technology.
   - Check: All interactive elements in `reader/`, `nav/`, `marks/editor.js`, `review/hub.js`, `settings/`, `about/`
   - Verify: Screen readers can identify navigation, main content, and interactive controls without ARIA workarounds for elements that should be semantic HTML. No `<div onclick>` patterns

2. **Keyboard navigation completeness** — All interactive elements are reachable via Tab. Focus order follows visual order. No keyboard traps (except intentional modal focus traps per Story 4 US17). Escape closes modals and panels. No `tabindex > 0` (which disrupts natural order). `tabindex="-1"` used only for programmatic focus targets.
   - Check: Tab order through nav panel, reader, mark editor modal, review hub, settings
   - Verify: No focusable elements are skipped. Arrow key navigation works in surah list (Story 3 Q5). Escape closes nav panel and mark editor modal

3. **Focus visibility** — All focusable elements have visible focus indicators that meet WCAG 2.2 minimum contrast. No `outline: none` without a replacement focus style. Focus is visible in all three themes (light, dark, sepia).
   - Check: CSS for `:focus`, `:focus-visible` styles in `core/theme.css` and component styles
   - Verify: Focus indicators are not removed globally. Each theme variant provides appropriate focus contrast against its background color

4. **ARIA attributes correctness** — `aria-expanded` on nav toggle reflects panel state. `aria-live` regions exist for dynamic content (mark save confirmation, download progress, error messages). `aria-label` on icon-only buttons. ARIA attribute values match actual DOM state at all times.
   - Check: `nav/index.js` toggle button, `marks/editor.js` modal, `data/offline.js` progress updates, `a11y/announcer.js`
   - Verify: `aria-expanded` toggles with panel open/close. `aria-live="polite"` regions exist for toast/status messages. `aria-live="assertive"` for errors. No stale ARIA values after state changes

5. **Form labels and descriptions** — All `<input>`, `<select>`, and `<textarea>` elements have associated `<label>` elements or `aria-label`. Search input in nav, confirmation input in clear-data, tag selector in mark editor all have labels. Placeholder text is not the only label.
   - Check: All form elements across `nav/` (search input), `marks/editor.js` (tag input), `settings/clear-data.js` (confirmation input)
   - Verify: Labels are programmatically associated via `for`/`id` or wrapping `<label>`, not just visual proximity

6. **Color not sole indicator** — State information (marked verse, active tag, selected theme, download progress) is communicated via more than color alone. Icons, text labels, or patterns supplement color for all state changes.
   - Check: Mark indicators on verses (`marks/indicator.js`), active nav item, selected theme option, download progress bar
   - Verify: A user who cannot perceive color differences can still distinguish marked from unmarked verses, active from inactive states, and progress levels

7. **Screen reader announcements for dynamic updates** — Route changes, mark save/delete confirmations, download progress updates, and error messages are announced to screen readers via `aria-live` regions or focus management. Uses `a11y/announcer.js` for all dynamic announcements.
   - Check: `core/router.js` route change handling, `marks/editor.js` save confirmation, `data/offline.js` progress, error UI in `reader/index.js`
   - Verify: After navigation, either focus moves to main content heading or an `aria-live` region announces the new view. Toast messages are within an `aria-live` region. `announcer.js` is used consistently, not bypassed

### Responsive Design

8. **Mobile-first CSS** — CSS is authored mobile-first with `min-width` breakpoints for larger screens. No `max-width` breakpoints that hide content on small screens. Base styles work at 320px viewport width without horizontal overflow.
   - Check: All CSS files — `core/theme.css`, component-specific styles
   - Verify: Media queries use `min-width` (progressive enhancement). No element overflows at 320px width. Text is readable without horizontal scrolling

9. **Flexible layouts** — Layout uses `flexbox` or `grid` with relative units (`rem`, `%`, `vw`/`vh`/`dvh`). No fixed pixel widths on containers that would break on narrow screens. Content area fills available space responsively.
   - Check: `#app-shell`, `#main-content`, `#nav-surface` layout in `core/theme.css`. Reader verse layout, review hub grid
   - Verify: No `width: 400px` on containers. Verse text wraps correctly at all widths. Layout doesn't break between 320px and 1440px

10. **Touch targets** — All interactive elements meet 44x44px minimum touch target size (WCAG 2.5.5). Adequate spacing between adjacent touch targets to prevent mis-taps on mobile.
    - Check: Buttons, links, toggle switches, verse mark triggers, nav surah list items, download button
    - Verify: Mark/unmark trigger area on verses is at least 44px. Nav panel links have adequate padding. Settings toggles and buttons meet minimum size

11. **Viewport meta tag** — `<meta name="viewport" content="width=device-width, initial-scale=1">` is present in `index.html`. No `user-scalable=no` (violates WCAG 1.4.4) or `maximum-scale=1` that prevents pinch-to-zoom.
    - Check: `index.html` `<head>` section for viewport meta tag
    - Verify: Users can zoom the page. No JavaScript overrides prevent zoom. `initial-scale=1` is set

12. **Reading layout at multiple widths** — Reader view renders correctly at phone (375px), tablet (768px), and desktop (1280px) widths. Arabic text does not overflow its container. Translation text wraps properly. Verse numbers remain aligned with their text.
    - Check: `reader/` CSS, verse element styles, `dir="rtl"` on Arabic content
    - Verify: No horizontal scrollbar at any standard width. Arabic right-to-left text respects `dir="rtl"` or appropriate CSS. Verse number alignment is consistent across widths

13. **Nav panel responsive behavior** — Nav panel is a slide-over overlay on mobile with backdrop, preventing interaction with content behind it. Opening nav on mobile does not push content off-screen. Closing panel restores full content view. Panel width is bounded (`max-width`) on larger screens.
    - Check: `nav/index.js` panel CSS, open/close behavior, backdrop element, `#nav-surface` styles in `core/theme.css`
    - Verify: Panel uses `position: fixed` or equivalent overlay pattern. Backdrop covers content. `max-width` prevents panel from being too wide on desktop

### UI Consistency

14. **Spacing system** — Spacing uses a consistent scale derived from CSS custom properties or a defined set of values (e.g., 4px/8px/16px/24px/32px multiples). No arbitrary magic-number margins or paddings throughout the codebase.
    - Check: CSS custom properties for spacing in `core/theme.css`. Usage of margin/padding values across all component styles
    - Verify: Spacing values derive from a defined scale or custom properties. Random values like `margin: 13px` or `padding: 7px` are absent. Spacing between verse blocks is consistent

15. **Typography hierarchy** — Font sizes follow a defined scale via CSS custom properties or consistent values. Headings, body text, captions, verse Arabic text, and translation text have distinct, consistent sizes. No inline `font-size` overrides that break the hierarchy.
    - Check: `core/theme.css` typography values (including `--qa-font-size-base`). Font sizes in component styles
    - Verify: Verse Arabic text, translation text, surah titles, and UI labels each have a defined size from the scale. No `font-size: 17px` one-offs that deviate from the system

16. **Component pattern reuse** — Similar UI elements (buttons, cards, list items, inputs) use the same CSS classes and patterns. No bespoke styling for visually identical elements across different views.
    - Check: Button styles in nav vs settings vs review hub. List item styles in nav surah list vs review mark list. Error state styling across modules
    - Verify: A button in review hub uses the same class as similar buttons elsewhere. Visual similarity matches code similarity. No duplicate CSS rules for the same visual pattern

17. **Theme completeness** — All three themes (light, dark, sepia) define values for every CSS custom property used in the app. No element has colors that only work in one theme (e.g., hardcoded `color: white` text that disappears on light theme backgrounds).
    - Check: CSS custom property definitions in `:root`, `[data-theme="dark"]`, and `[data-theme="sepia"]` blocks in `core/theme.css`
    - Verify: Every `color`, `background-color`, `border-color`, and `box-shadow` used in the app derives from a theme-aware custom property. No hardcoded color values (`#333`, `rgb(...)`) outside the theme system

18. **Visual alignment consistency** — Content areas, headers, and verse blocks are aligned to a consistent grid across views. Left/right padding is consistent across route views (reader, review, settings, about). No visual "jumps" or layout shifts when navigating between views.
    - Check: Layout containers and padding values across all route view modules
    - Verify: `#main-content` has consistent padding. Navigation between reader and review hub does not shift the header or content area horizontally. All views share the same content width constraints
