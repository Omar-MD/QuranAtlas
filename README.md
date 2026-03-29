# QuranAtlas

Distraction-free Quran reader. Online-first browser PWA with offline reading capability.

## Prerequisites

- Node.js 22+ (see `.nvmrc`)
- npm 10+

## Setup

```bash
nvm use          # or fnm use
npm install
```

## Development

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build locally
```

## Testing

```bash
npm run test       # Unit tests (Vitest)
npm run test:e2e   # E2E tests (Playwright, requires build first)
npm run ci:local   # Full CI pipeline locally: lint + test + build + e2e + lighthouse
```

## Linting & Formatting

```bash
npm run lint       # ESLint (zero warnings enforced)
npm run format     # Prettier (write)
npm run format:check  # Prettier (check only)
```

## Project Structure

```
src/
  core/          # Entry point, event bus, IDB, router, error handling
  reader/        # Continuous reading view, verse cards, scroll
  navigation/    # Surah/juz/verse navigation tabs
  marks/         # Verse mark CRUD, tag input, undo
  review/        # Review hub, filtered verse reader
  dataset/       # Dataset loading, corpus, metadata, integrity
  offline/       # Offline download flow, Background Fetch
  settings/      # Settings surface, theme store
  about/         # About page, provenance display
  safety/        # Input validation
  a11y/          # Screen reader announcements
  sw.js          # Custom Service Worker (Workbox injectManifest)

docs/
  master-plan.md                  # Full project specification
  tech-stack-decision-record.md   # Technology choices with justification
  specs/                          # Feature specs with acceptance criteria

tests/
  unit/          # Vitest unit tests (mirrors src/ structure)
  e2e/           # Playwright E2E tests (one per story)

public/
  dataset/       # Pre-built Quran dataset (JSON)
  fonts/         # KFGQPC Uthman Taha Naskh WOFF2
  icons/         # PWA icons

scripts/
  build-dataset.js  # Dataset build pipeline (Node.js)
```

## License

Non-commercial use only. The Clear Quran translation is licensed under CC BY-NC-ND 4.0.
