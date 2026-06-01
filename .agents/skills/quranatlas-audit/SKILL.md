---
name: quranatlas-audit
description: Use only when the user explicitly asks to audit, health-check, readiness-review, assess deploy readiness, or review QuranAtlas product/codebase quality.
---

# QuranAtlas Audit

Use this for explicit audit requests only.

## Required Reads

- `docs/product-info.md`
- `docs/tech-stack.md`
- `docs/context/implemented.md`
- `docs/context/open-issues.md`
- Relevant surface dossiers under `docs/context/surfaces/`

## Audit Baseline

Evaluate at least:

- Reader First baseline: Verse/Mushaf reading, bookmarks, saved position, Daily Wird, search/navigation, reader preferences, and curated reader-attached metadata.
- One-active-pack and install-before-activate semantics for qira'ah/riwayah, translation, tafsir, curated metadata, Mushaf pages, and search/index assets.
- Removed-scope boundaries: audio and personal marks/tags/notes/review/edges are not product scope except bookmarks.
- AI boundary: answer, assistant, chat, agent, synthesis, or guided-study products must be citation-first, source-bounded, and explicit about evidence limits; generated Quran text and unsupported theological claims remain out of scope.
- Architecture, correctness, reliability, performance, security, accessibility, and UI quality.

## Evidence Rules

- Ground every material finding in code or doc references.
- Separate shipped-behavior defects from enhancement ideas.
- Verify severe findings before presenting them.
- Prefer local repo state and history over remote metadata unless the user asks about PRs, CI, branches, or hosted state.

## Output

Lead with findings ordered by severity, then open questions, residual risk, and a prioritized fix list.
