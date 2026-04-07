# QuranAtlas

**Read, reflect, remember.**

A distraction-free Progressive Web App for reading the Quran on mobile devices. Works seamlessly online and offline, with a focused reading experience featuring Arabic text (Uthmani script) and English translation.

## Features

- Clean Arabic text with English translation (Bridges' by Fadel Soliman)
- Translation toggle on/off
- Three themes: Light, Sepia, Dark
- Session restore — picks up where you left off
- Verse marking with tags (Favourite, Study, Reflection, Question)
- Review hub to browse all your marks
- Surah navigation with live search
- Verse deep links (`#/s/2/255`)
- Full offline support — download once, read anywhere
- PWA install — add to home screen for native app experience
- Automatic dataset updates

## Tech Stack

| Layer | Tool |
|---|---|
| Package Manager | pnpm |
| Build Tool | Vite 8 (Rolldown-powered) |
| PWA | vite-plugin-pwa + Workbox (injectManifest) |
| CSS | Lightning CSS |
| Testing | Vitest + jsdom + fake-indexeddb |
| E2E | Playwright |
| Linting | ESLint (strict mode) |

See [docs/tech-stack.md](docs/tech-stack.md) for full details and rationale.

## Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`corepack enable` or `npm install -g pnpm`)

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test          # watch mode
pnpm test:run      # single run

# Lint
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Available Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with HMR at `http://localhost:5173` |
| `pnpm build` | Build for production (outputs to `dist/`) |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run tests once and exit |
| `pnpm test:coverage` | Run tests with V8 coverage report |
| `pnpm lint` | Run ESLint on `src/` |
| `pnpm check-chunks` | Verify no JS chunk exceeds 150KB gzip |

## Project Structure

```
src/
├── core/                    # Infrastructure
│   ├── app.js               # Bootstrap: wires modules, init lifecycle
│   ├── router.js            # Hash router with launch restore
│   ├── events.js            # Global pub/sub event bus
│   ├── db.js                # IndexedDB connection (v1 schema)
│   └── theme.css            # CSS variables for 3 themes
│
├── data/                    # Data access & offline
│   ├── dataset.js           # Corpus access: getSurah(), getSurahs()
│   ├── offline.js           # PWA install + corpus download
│   └── dataset-updater.js   # Version check + cache invalidation
│
├── reader/                  # Reading experience (#/s/:surah/:ayah)
│   ├── index.js             # Route handler
│   ├── scroll-tracker.js    # Position tracking via IntersectionObserver
│   └── resume-indicator.js  # "Resume reading" banner
│
├── nav/                     # Navigation & browsing
│   └── index.js             # Surah list, search, filter
│
├── marks/                   # Verse marking & tagging
│   ├── store.js             # IDB CRUD for marks
│   ├── tags.js              # Default tag registry
│   ├── editor.js            # Long-press modal, tag assignment
│   └── indicator.js         # Colored dots on verses
│
├── review/                  # Review hub (#/review)
│   ├── hub.js               # All Marks: grouping, filtering, pagination
│   └── state.js             # Review state persistence
│
├── settings/                # Settings (#/settings)
│   ├── index.js             # Settings page
│   ├── theme.js             # Theme management
│   └── clear-data.js        # Destructive data clear
│
├── about/                   # About (#/about)
│   ├── index.js             # About page
│   ├── versions.js          # App + dataset versions
│   ├── attribution.js       # Credits
│   ├── storage.js           # Storage quota display
│   └── pwa-install.js       # Install button
│
├── safety/                  # Cross-cutting safety
│   └── input-validator.js   # Navigation + tag validation
│
├── a11y/                    # Accessibility
│   └── announcer.js         # aria-live announcements
│
└── sw.js                    # Service worker (separate context)
```

## Architecture

### Module Communication

All cross-module communication goes through `core/events.js` (pub/sub bus), with two documented exceptions:
- `safety/` modules — may be imported directly by any feature
- `a11y/` modules — may be imported directly by any feature

Feature modules must not import from other feature modules (except `review/` → `marks/store.js` for data access).

### IndexedDB Schema (v1)

| Store | Key Path | Purpose |
|---|---|---|
| `settings` | `key` | Translation toggle, theme, deleted defaults |
| `positions` | `id` | Per-surah reading position, review state |
| `marks` | `verseKey` | Marked verses with tags (indexes: `by-tag`, `by-updated`) |
| `activationState` | `id` | Offline download/update state machine |
| `datasetMeta` | `id` | Dataset version tracking |

### Routing

| Route | Module |
|---|---|
| `#/s/:surah` | `reader/index.js` |
| `#/s/:surah/:ayah` | `reader/index.js` |
| `#/review` | `review/hub.js` |
| `#/settings` | `settings/index.js` |
| `#/about` | `about/index.js` |

## Development Phases

**Phase 1** — Online reading, PWA install, continuous reader with session restore, surah navigation
**Phase 2** — Verse marks with default tags, review hub
**Phase 3** — visibilitychange safety, verse deep links, dataset updates, settings/about
**Phase 4** (future) — BroadcastChannel sync, custom tags, Filtered Verse Review, bulk delete

See [docs/product-info.md](docs/product-info.md) for the full product overview and [docs/specs/](docs/specs/) for detailed story specifications.

## Testing

```bash
# Run all tests
pnpm test:run

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test db.test.js

# Watch mode (re-runs on file change)
pnpm test
```

Tests use Vitest with jsdom environment and fake-indexeddb. The pattern established in `tests/unit/core/db.test.js` serves as prior art for all IDB-related tests.

### MCP (Model Context Protocol)

QuranAtlas includes 5 specialized Playwright MCP profiles for interactive testing:

```bash
# Cleanup old screenshots
pnpm mcp:cleanup

# Remove all screenshots
pnpm mcp:clean-all
```

**Profiles:**
- `playwright-mobile` - Mobile debugging (393x851, headed)
- `playwright-tablet` - Tablet testing (768x1024, headed)
- `playwright-desktop` - Desktop debugging (1280x720, headed)
- `playwright-ci` - Automated testing (393x851, headless)
- `playwright-offline` - PWA offline testing (393x851, headed)

See [docs/mcp-usage.md](docs/mcp-usage.md) for detailed usage guide.

## License

ISC
