---
name: ship
description: Run full CI validation, commit staged changes with [full-ci] flag, and push to origin
---

1. `npm run ci:local` — stop and report the failing step if it fails. Do not proceed.
2. `git status` + `git diff --staged` — nothing staged → stop.
3. Ask for commit message if not provided as argument. Append ` [full-ci]` automatically.
4. Commit following `/commit` conventions (conventional format + Co-Authored-By trailer).
5. `git push origin HEAD` — if rejected, report and stop. No force push.
6. Report SHA, branch, and confirm full CI pipeline triggered.
