---
name: commit
description: Stage, compose a conventional commit message, and commit
---

Create a git commit for the current staged changes. If nothing is staged, check for unstaged changes and ask the user which files to stage.

## Steps

1. **Check state** — run `git status` and `git diff --staged`. If nothing is staged and nothing is modified, tell the user and stop.

2. **Stage if needed** — if there are unstaged changes but nothing staged, show the user the changed files and ask which to stage before proceeding.

3. **Review changes** — run `git diff --staged` to understand what is being committed. Run `git log --oneline -5` to match the repo's existing commit message style.

4. **Compose message** — write a conventional commit message:
   - Format: `type(scope): short description` (scope optional)
   - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`
   - Subject line: imperative mood, max 72 characters, no trailing period
   - If the change warrants it, add a blank line followed by a short body
   - Always end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

5. **Commit** — run `git commit` with the composed message passed via heredoc to preserve formatting. Do not use `--no-verify`.

6. **Confirm** — report the commit SHA and subject line.
