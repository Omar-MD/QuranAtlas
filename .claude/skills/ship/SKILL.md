---
name: ship
description: Run full CI validation, commit staged changes with [full-ci] flag, and push to origin
---

Run the full local validation suite, then commit all staged changes with the `[full-ci]` flag appended to the commit message, and push to origin. This triggers e2e, Lighthouse, and deploy on top of the default pipeline (lint + unit tests + build) on GitHub Actions.

## Steps

1. **Pre-flight check** — run `npm run ci:local` and stop immediately if it fails. Report which step (lint, format, test, build) produced the error and do not proceed to commit.

2. **Verify staged changes** — run `git status` and `git diff --staged`. If nothing is staged, tell the user and stop.

3. **Commit message** — ask the user for a commit message if they haven't provided one as an argument. Append ` [full-ci]` to the message automatically.

4. **Commit** — create the commit following the same conventions as /commit (conventional commits format, Co-Authored-By trailer).

5. **Push** — run `git push origin HEAD`. If the push is rejected (e.g. non-fast-forward), report the error and stop — do not force push.

6. **Confirm** — report the commit SHA, the branch pushed to, and remind the user that the full CI pipeline including deploy has been triggered.
