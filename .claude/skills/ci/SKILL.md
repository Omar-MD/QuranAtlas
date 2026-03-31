---
name: ci
description: Show CI status of the current branch using the GitHub CLI
---

1. `gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 5`
2. `gh run view <run-id>` for the most recent run — get job-level breakdown.
3. Present: overall status, which jobs passed/failed/skipped, first error lines via `gh run view <run-id> --log-failed` if any failed, whether `[full-ci]` was active (e2e/lighthouse/deploy jobs present).
4. No runs on this branch → say so.
