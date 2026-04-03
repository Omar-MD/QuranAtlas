---
name: commit
description: Stage, compose a conventional commit message, and commit
---

1. `git status` + `git diff --staged`. Nothing staged and nothing modified → stop.
2. Unstaged but nothing staged → show changed files, ask which to stage.
3. `git diff --staged` + `git log --oneline -5` to understand changes and match message style.
4. Compose conventional commit: `type(scope): description` (imperative, ≤72 chars, no trailing period). Types: `feat` `fix` `refactor` `test` `docs` `chore` `ci` `style`. Add body if warranted. End with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
5. `git commit` via heredoc. No `--no-verify`.
6. Report SHA and subject line.
