# QuranAtlas

Distraction-free Quran reader. Online-first browser PWA with offline reading after explicit download. Non-commercial (CC BY-NC-ND 4.0 translation constraint).

## Tech Stack

| Layer         | Technology                                          | Version         |
| ------------- | --------------------------------------------------- | --------------- |
| Language      | Vanilla JS ES2022+ (no TypeScript, no framework)    | ES2022          |
| Build         | Vite                                                | 6.x             |
| CSS           | Lightning CSS (via Vite built-in `css.transformer`) | Vite-integrated |
| PWA           | vite-plugin-pwa + Workbox 7 (`injectManifest` mode) | Workbox 7.4.x   |
| IDB wrapper   | idb                                                 | 8.x             |
| Unit tests    | Vitest + fake-indexeddb                             | Vitest 3.x      |
| E2E tests     | Playwright (Chromium only)                          | 1.x             |
| Lighthouse CI | @lhci/cli                                           | 0.15.x          |
| Lint          | ESLint v9 flat config                               | 9.x             |
| Format        | Prettier + eslint-config-prettier                   | 3.x             |
| Pre-commit    | lefthook                                            | latest          |
| Hosting       | Cloudflare Pages (free tier)                        | -               |
| CI/CD         | GitHub Actions                                      | -               |
| Node.js       | 22 LTS                                              | 22.x            |

## Architecture

- **Module map:** `src/core/`, `src/reader/`, `src/navigation/`, `src/marks/`, `src/review/`, `src/dataset/`, `src/offline/`, `src/settings/`, `src/about/`, `src/safety/`, `src/a11y/`, `src/sw.js`
- **Communication:** All cross-module communication through `src/core/events.js` (pub/sub). No direct imports across domain boundaries except into `core/`.
- **Data layer:** IDB for metadata (marks, positions, settings). Cache Storage for corpus text (per-surah JSON files). No localStorage.
- **Rendering:** All Quran text via `textContent` or `createTextNode`. Never `innerHTML` with corpus data.

See `docs/master-plan.md` for full architecture and `docs/tech-stack-decision-record.md` for tech stack justification.

## Coding Conventions

### Naming

- Files: `kebab-case.js` (e.g., `verse-card.js`, `tag-input.js`)
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Event names: `domain:action` (e.g., `marks:saved`, `reader:scroll`, `dataset:ready`)
- IDB store names: `camelCase` (e.g., `datasetMeta`, `activationState`)
- CSS classes: `kebab-case` with `qa-` prefix (e.g., `qa-verse-card`, `qa-nav-tab`)
- CSS custom properties: `--qa-{category}-{name}` (e.g., `--qa-color-bg`, `--qa-font-arabic-size`)

### Style Rules

- ES modules (`import`/`export`). No CommonJS in `src/`.
- No `var`. Use `const` by default, `let` only when reassignment is needed.
- No classes unless wrapping a browser API. Prefer plain functions and objects.
- No `this` outside of DOM event handlers where it refers to the element.
- No default exports. Use named exports only.
- Template literals for string interpolation. No string concatenation with `+`.
- Early returns over nested `if/else`.
- Destructuring for function parameters with >2 properties.

### Forbidden Patterns

- `eval()`, `new Function()`, `setTimeout(string)` — enforced by ESLint
- `innerHTML`, `outerHTML`, `insertAdjacentHTML` with untrusted data — enforced by eslint-plugin-no-unsanitized
- `localStorage`, `sessionStorage` — enforced by ESLint `no-restricted-globals`
- `document.write`
- Inline event handlers (`onclick="..."`)
- CSS `px` for layout dimensions — use `rem`, `em`, logical units
- `user-scalable=no` in viewport meta
- `outline: none` without `:focus-visible` replacement
- String manipulation of Arabic corpus text

## Module Boundaries

- Modules may import from `core/` (events, db, router).
- Modules must NOT import directly from sibling domains. Use `core/events.js` pub/sub.
- The `safety/input-validator.js` module is an exception — it may be imported by any module needing validation.
- The `a11y/announcer.js` module is an exception — it may be imported by any module needing screen reader announcements.

## Agent Permissions

Agents ARE permitted to:

- Create and modify files within the `src/` directory structure defined in the module map
- Create and modify test files in `tests/unit/` and `tests/e2e/`
- Modify configuration files (`vite.config.js`, `eslint.config.js`, `vitest.config.js`, `playwright.config.js`, `lefthook.yml`)
- Run `npm run lint`, `npm run test`, `npm run build`, `npx playwright test`
- Create new modules within existing domains when the spec requires it

Agents are NOT permitted to:

- Add new npm dependencies without explicit approval
- Create new top-level directories outside the defined module map
- Modify `docs/master-plan.md` or `docs/tech-stack-decision-record.md`
- Use any forbidden pattern listed above
- Add analytics, telemetry, or external network calls
- Modify the dataset files in `public/dataset/` (build pipeline output only)
- Skip or weaken ESLint rules
- Use `localStorage` or `sessionStorage` for any purpose
- Add TypeScript or any framework

## Testing Strategy

### Unit Tests (Vitest)

- Location: `tests/unit/{domain}/{module}.test.js`
- Environment: jsdom + fake-indexeddb
- Coverage: v8 provider, thresholds: lines 80%, functions 80%
- Every IDB operation must be tested with fake-indexeddb
- Every pub/sub event must be tested (emit + subscribe)
- Every input validation function must have boundary-value tests

### E2E Tests (Playwright)

- Location: `tests/e2e/{story}.spec.js`
- Browser: Chromium only
- Must test: offline reading (via `context.setOffline()`), IDB state persistence, dataset download + SHA-256 verification, navigation + deep links
- Must NOT test: actual OS-level PWA install dialog

### Performance

- Lighthouse CI thresholds: PWA >= 80, Performance >= 80, A11y >= 90, Best Practices >= 85
- Chunk size gate: no chunk > 150 KB gzip
- Custom metric: `performance.mark('first-verse-render')` asserted in Playwright (< 800 ms at 4x CPU throttle)

## Definition of Done

A task is done when:

1. All acceptance criteria from the spec are met
2. `npm run lint` passes (zero errors, zero warnings)
3. `npm run test` passes (all unit tests, coverage thresholds met)
4. No forbidden patterns introduced
5. No direct cross-module imports outside `core/` (except `safety/`, `a11y/`)
6. Quran text rendered verbatim — `textContent` only, no string transforms
7. Touch targets >= 44x44 CSS px for interactive elements
8. `prefers-reduced-motion` honoured for any new animation/transition
9. Arabic font >= 20 CSS px, line-height >= 1.8x
10. Works offline if the feature touches the reading path (after dataset download)

## Key Commands

```bash
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint (zero warnings)
npm run format     # Prettier write
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright E2E tests
npm run ci:local   # lint + test + build + e2e + lighthouse
```

## Implementation Workflow

### Task Tracking

All implementation work is tracked using Claude's Task system (TaskCreate/TaskUpdate). Each Phase 0 acceptance criterion and each story is broken into discrete tasks. Tasks are marked `in_progress` when started and `completed` when the DoD is fully met.

### Frontend Design Process (Iterative)

UI/visual work follows a design-before-code loop:

1. **Mockup round** — Present 2-4 ASCII layout mockups via `AskUserQuestion` showing the candidate designs
2. **User selects** — User picks a design or requests changes
3. **Iterate** — Refine and re-present until the design is approved
4. **Implement** — Only write HTML/CSS/JS after explicit design approval

This applies to: verse card layout, navigation surface, mark editor, review hub, settings, about page, and any new surface. Do NOT implement UI speculatively — always get design sign-off first.

### Dataset Build Source

`scripts/build-dataset.js` uses quran.com API as primary source with quran-json GitHub repo as fallback (if API is unavailable or rate-limited).

## References

- Master Plan: `docs/master-plan.md`
- Tech Stack Decision Record: `docs/tech-stack-decision-record.md`
- Feature Specs: `docs/specs/` (one file per story)
