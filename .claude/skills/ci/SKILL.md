---
name: ci
description: Show CI status of the current branch using the GitHub CLI
---

Show the CI status of the current branch using the GitHub CLI.

## Steps

1. Run `gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 5` to list recent runs on this branch.

2. For the most recent run, run `gh run view <run-id>` to get the full job-level breakdown.

3. Present a concise summary:
   - Overall status (queued / in progress / success / failure)
   - Which jobs passed, failed, or were skipped
   - If any job failed, show the first relevant error lines using `gh run view <run-id> --log-failed`
   - Whether `[full-ci]` was active (indicated by whether build, e2e, lighthouse, and deploy jobs are present in the run)

4. If no runs exist for the current branch, say so clearly.
