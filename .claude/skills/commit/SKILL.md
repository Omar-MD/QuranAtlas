---
name: commit
description: Use when about to create a git commit
---

## Red Flags — STOP

- About to run `git commit` without the `-v` flag
- About to skip the diff review step
- About to use `--no-verify` to bypass a hook
- About to commit without reading the staged diff first

**Violating any step is a violation of the discipline. Do not rationalize.**

## Workflow

1. Run `git status` and `git diff --staged`.
   - Nothing staged and nothing modified → stop.
   - Nothing staged but changes exist → show changed files, ask which to stage.

2. Run `git diff --staged` and `git log --oneline -5` to understand the staged changes and match message style.

3. Compose the commit message following [Conventional Commits](https://www.conventionalcommits.org/):
   - Format: `type(scope): description`
   - Subject: imperative mood, ≤72 chars, no trailing period
   - Types: `feat` `fix` `refactor` `test` `docs` `chore` `ci` `style`
   - Scope: optional, use the module or concern being changed
   - Body: add a blank line followed by explanation if the change is non-trivial
   - Footer: reference issues/PRs with `Refs: #123` or `Closes: #123`

4. Run `git commit -v` to open the editor with a verbose diff for review. Do NOT use `--no-verify`.

5. On hook failure: read the error, fix the issue, then re-run step 4.

6. On success, report: `✓ Committed <SHA> — <subject>`
