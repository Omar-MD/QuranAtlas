# Story 6: Cross-tab safety | P3 | Requires: Story 4

- `BroadcastChannel('quran-atlas:db-events')` broadcasts all mark mutations; tab B receives within 1 second; `visibilitychange→visible` triggers IDB re-read for missed updates; `missedUpdatesWhileHidden` flag + debounce prevents double re-render
- IDB `versionchange` → close DB + show reload prompt (no stale schema access); draft conflict: stale tab has unsaved editor content + newer IDB version → show preserve/load-latest choice; no draft → apply silently
- Events: sync:update-received, sync:conflict-detected
