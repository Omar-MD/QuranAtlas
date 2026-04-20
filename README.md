# QuranAtlas

**Read, reflect, remember.**

[![CI](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml?query=branch%3Amain)
[![Deploy](https://github.com/Omar-MD/QuranAtlas/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/Omar-MD/QuranAtlas/actions/workflows/deploy.yml?query=branch%3Amain)

QuranAtlas is a distraction-free, offline-first Qur'an reading app. Continuous verse-interleaved reading with Arabic (Uthmani) and English translation, personal verse marks with custom tags, and ambient navigation that gets out of the way while you read.

## Environments

| Branch | Domain | Status |
|---|---|---|
| `main` (production) | [quranatlas.org](https://quranatlas.org) · [www.quranatlas.org](https://www.quranatlas.org) | [![CI](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml?query=branch%3Amain) [![Deploy](https://github.com/Omar-MD/QuranAtlas/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/Omar-MD/QuranAtlas/actions/workflows/deploy.yml?query=branch%3Amain) |
| `staging` | [staging.quranatlas.org](https://staging.quranatlas.org) | [![CI](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml/badge.svg?branch=staging)](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml?query=branch%3Astaging) |
| `dev` | [dev.quranatlas.org](https://dev.quranatlas.org) | [![CI](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/Omar-MD/QuranAtlas/actions/workflows/ci.yml?query=branch%3Adev) |

Click any badge to open the workflow's run list — the most recent run (and any failures) are listed there.

## Who is it for?

- Muslims who want a focused, uncluttered way to read the Qur'an on their phone or laptop.
- Readers who need reliable offline access — commutes, travel, prayer times with no signal.
- Students who mark verses by theme (mercy, patience, tawakkul, etc.) and revisit them grouped by tag.

## What you get

### Reading experience
- Continuous verse-interleaved layout. Arabic (Uthmani script via KFGQPC) on top of each verse, English translation (Bridges' by Fadel Soliman) underneath.
- Translation toggle (on/off) — persists across sessions.
- Four themes: **Light**, **Sepia**, **Dark**, **Auto** (follows `prefers-color-scheme`, flips live when the OS changes).
- Adjustable font size (slider + `⌘↑` / `⌘↓` / `0` shortcuts).
- Chunked rendering so long surahs stay responsive.
- Session restore — close the app and return later to the last-read verse.
- Desktop layout (≥1180px) — centered reader, mark editor as a verse-hero modal, review hub with a sticky left rail.

### Navigation
- **Ambient dock** (floating bottom pill: Read · Search · Review · More) and **ambient pill** (current `{surah}:{verse}` on the reader).
- **Command sheet** (`⌘K`) — unified search across surahs, verses, tags, marks, commands. Type `2:255` to jump; type `mer` to deep-link to the `mercy` tag.
- **Surah directory** (`#/surahs`) with search, filter (All / Bookmarked / Recent), continue-reading card.
- Deep links for every verse (`#/s/{surah}/{ayah}`) and every tag (`#/t/{tag}`).

### Marks, tags, review
- **One action surface per verse: the mark editor.** Reachable by long-press, right-click, `m`, or the command sheet.
- 16 seed tags + create-your-own tags inline; free-text note per mark; delete with undo toast.
- **Review hub** (`#/review`) — three-segment grouping pill (Tag / Surah / Date), tag + surah filters, sort, pagination. Marks render as a flat deduped list.
- **FVR — Filtered-Verse Review** (`#/t/{tag}`) — all verses carrying a single tag, shareable by link.
- **Cross-tab coherence** — mark writes broadcast to other tabs via BroadcastChannel.

### First-run onboarding
- Five-screen walkthrough: Welcome → Theme → Translation → Shortcuts primer → Tags intro. Skip available from screen 2 onward.

### Keyboard shortcuts
Full reference via `?` from any non-input context.
- **Universal**: `⌘K` command sheet · `?` cheatsheet · `Esc` close / back from FVR.
- **"Go to" chords**: `g h` continue · `g s` surah list · `g r` review · `g a` about · `g p` preferences.
- **Reader**: `j` / `k` next/prev verse · `]` / `[` next/prev surah · `m` mark centered verse · `t` translation · `+` / `-` / `0` font · `d` cycle theme.

### Offline & privacy
- Service worker caches the full Qur'an corpus (6,236 verses) on first online use. Subsequent launches work fully offline.
- Dataset updates fetched in background, verified by SHA-256, promoted atomically.
- PWA install — add to home screen.
- Everything lives in IndexedDB on the user's device. No sync, no tracking, no analytics, no backend. Clearing data is one tap.

## What's NOT included

Deliberately out of scope: audio recitation, transliteration, page-based Mushaf layout, full-text search across all verses, copy-verse / sharing, multi-device sync, community features, multiple translation editions (today: Bridges' only), footnotes / tafsir, import/export.

## Tech stack

Svelte 5 + TypeScript, Vite 8 (Rolldown), vite-plugin-pwa + Workbox (custom `src/sw.js`), IndexedDB, Vitest, Playwright, Lighthouse CI. CI/CD via GitHub Actions + Cloudflare Pages. Full details and rationale in [docs/tech-stack.md](docs/tech-stack.md).

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests, watch mode
pnpm run validate # full local gate: lint + typecheck + tests + build + chunk budget
```

Prerequisites: **Node.js 20+** and **pnpm 10+** (`corepack enable` will provision the pinned version).

## Git flow

Three long-lived branches, each mapped to a deployment:

- `main` → production — merge commit via PR; CI green required.
- `staging` → `staging.quranatlas.org` — merge commit via PR from `dev`; CI green required.
- `dev` → `dev.quranatlas.org` — direct pushes allowed; deploy runs only when CI passes.

Feature branches merge into `dev` and are deleted after merge. The three env branches are protected from deletion and force-push. CI runs on push and PR to any of the three; deploy fires via `workflow_run` on green CI.

## Docs

- Product overview: [docs/product-info.md](docs/product-info.md)
- Architecture, routing, events, boot flow: [docs/context/architecture.md](docs/context/architecture.md)
- Feature map, module graph, events, data model, user journeys: [docs/context/](docs/context/)
- Tech stack + CI/CD detail: [docs/tech-stack.md](docs/tech-stack.md)
- Repo rules: [CLAUDE.md](CLAUDE.md) (authoritative for anyone touching the codebase)

## License

ISC
