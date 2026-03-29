# QuranAtlas

Distraction-free Quran reader. Online-first browser PWA with offline reading after explicit download. Translation: Bridges' Translation by Fadel Soliman (bridgesislam.com) — verify license before any commercial use.

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
- Use `/commit` and `/ship` skills for git operations (staging, committing, pushing)
- Check CI status with `/ci` skill
- Create new modules within existing domains when the spec requires it

Agents are NOT permitted to:

- Add new npm dependencies without explicit approval
- Create new top-level directories outside the defined module map
- Modify `docs/master-plan.md` or `docs/tech-stack-decision-record.md`
- Add analytics, telemetry, or external network calls
- Modify the dataset files in `public/dataset/` (build pipeline output only)
- Skip or weaken ESLint rules

## Testing & Definition of Done

Detailed rules are in `.claude/rules/testing.md` and `.claude/rules/definition-of-done.md` (loaded automatically when editing `src/` or `tests/`). Run `/verify` before committing to check all criteria.

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

## Claude Code Skills

Available slash commands for streamlined workflows:

- **`/spec <N>`** — Load story N spec, extract acceptance criteria, create tasks (start here)
- **`/verify`** — Run full DoD checklist: lint, tests, coverage, build, chunks, forbidden patterns, module boundaries
- **`/commit`** — Stage files, compose a conventional commit message, and commit
- **`/ci`** — Show CI status of the current branch using GitHub CLI
- **`/ship`** — Run full CI validation locally, commit with `[full-ci]` flag, and push to origin

The spec-driven development loop: `/spec` → implement → `/verify` → `/commit` → `/ship`

All work happens on `main` unless the user creates a feature branch. Use `/commit` for incremental progress. Use `/ship` only when a story or phase is complete and ready for full validation.

### CI Flag: `[full-ci]`

By default, CI runs lint + format check + unit tests + build + chunk size gate. To also run e2e tests, Lighthouse CI, and deploy:

- **For commits:** include `[full-ci]` in the commit message
- **For PRs:** include `[full-ci]` in the PR title

The workflow detects the flag and conditionally enables expensive jobs. Use `/ship` to automate this for releases.

## Implementation Workflow

### Task Tracking

All implementation work is tracked using Claude's Task system (TaskCreate/TaskUpdate). Each Phase 0 acceptance criterion and each story is broken into discrete tasks. Tasks are marked `in_progress` when started and `completed` when the DoD is fully met.

### Frontend Design Process (Iterative)

UI/visual work follows a design-before-code loop:

1. **Mockup round** — Create 2-4 browser-renderable HTML files in `mockups/` and ask the user to review them
2. **User selects** — User picks a design or requests changes
3. **Iterate** — Refine mockup files and re-present until the design is approved
4. **Implement** — Only write HTML/CSS/JS in `src/` after explicit design approval

This applies to: verse card layout, navigation surface, mark editor, review hub, settings, about page, and any new surface. Do NOT implement UI speculatively — always get design sign-off first. Never use ASCII art as a substitute for browser mockups.

### Dataset Build Source

`scripts/build-dataset.js` uses quran.com API as primary source with quran-json GitHub repo as fallback (if API is unavailable or rate-limited).

### Keeping Documentation Current

**CLAUDE.md** — When a decision during implementation changes any of the following, ask the user before the conversation ends whether CLAUDE.md should be updated:

- Tech stack (new dependency, version bump, tool swap)
- Architecture (new module, changed boundaries, new communication pattern)
- Coding conventions or forbidden patterns
- Workflow or process (new skill, changed CI pipeline, updated DoD)
- Agent permissions

Do NOT silently update CLAUDE.md. State what changed, quote the specific section(s) that are now stale, and propose the edit. Only apply it after explicit approval.

**Master Plan / Tech Decision Record** — When implementation reality diverges from what these documents describe (e.g., a planned API doesn't exist, a boundary shifted, a phase assumption proved wrong):

1. Flag the discrepancy — state what the document says vs. what is actually true
2. Do NOT propose edits or modify these files unprompted
3. Let the user decide whether to update the document, adjust the implementation, or leave it as-is
4. Only draft changes to these files if the user explicitly asks

## References

- Master Plan: `docs/master-plan.md`
- Tech Stack Decision Record: `docs/tech-stack-decision-record.md`
- Feature Specs: `docs/specs/` (one file per story)
