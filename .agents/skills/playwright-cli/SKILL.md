---
name: playwright-cli
description: Drive a real browser to verify QuranAtlas reader, search, and settings surfaces with the repo Playwright CLI.
allowed-tools: Bash(playwright-cli:*), Bash(mise:*)
---

# Browser verification with playwright-cli

QuranAtlas is an offline-first Quran reading PWA. Verify behavior on the real
app through accessible roles and names, visible content, URLs, and persisted
state. Never assert CSS classes, DOM shape, or icon internals. The repo has no
screenshot tests and no screenshot artifacts — do not take or save screenshots.
Never commit browser state.

## Start the app

Always launch through mise so the pinned toolchain is used:

```bash
mise run dev              # dev server on http://127.0.0.1:5173 (run in background)
mise run preview          # production preview on http://127.0.0.1:4173 (needs mise run build:release first)
```

Reader data must exist before UI work: `mise run data:build` populates
`public/dataset/**` and `public/search-packs/**`. Missing `/dataset/...` or
`/search-packs/...` responses mean the data is stale — rerun it.

## Sessions

```bash
playwright-cli open http://127.0.0.1:5173              # desktop, default session
playwright-cli -s mobile open --device="Pixel 5" http://127.0.0.1:5173
playwright-cli -s mobile resize 375 812                # match the mobile smoke project viewport
playwright-cli list                                    # running sessions
playwright-cli -s mobile close                         # end one session
playwright-cli close                                   # end the default session
```

Use one named session per viewport: default for desktop, `-s mobile` with
`--device="Pixel 5"` resized to 375x812 to match the mobile smoke project.

## Inspect

Every command prints an accessibility snapshot with element refs. Prefer
`snapshot`/`find` over selectors; refs (e12) come from the latest snapshot.

```bash
playwright-cli snapshot                 # page URL, title, a11y tree, refs
playwright-cli find "Verse reader"      # locate by accessible name
playwright-cli find --regex "/s/\\d+"   # locate by regex
playwright-cli click e12                # act on a ref
playwright-cli fill e5 "patience" --submit
playwright-cli eval "location.hash"     # assert URL / runtime state
playwright-cli console                  # console messages (check for errors)
playwright-cli requests                 # network requests (check for failures)
```

After each navigation, confirm the expected landmark/content in the snapshot,
check `console` for errors, and scan `requests` for failed fetches.

## Offline behavior

The dev server has no service worker. For offline/PWA behavior, build and
serve production first:

```bash
mise run build:release && mise run preview
playwright-cli open http://127.0.0.1:4173
```

`mise run offline` runs the automated offline lifecycle suite against a
disposable static server serving the same release dist.

## Cleanup

```bash
playwright-cli close-all
playwright-cli delete-data
```

`.playwright-cli/` snapshots and browser profiles are gitignored — never
commit them; remove snapshot files when the task ends.
