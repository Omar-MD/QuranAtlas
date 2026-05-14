---
name: quranatlas-product-audit
description: Run a QuranAtlas-specific product audit across architecture, correctness, reliability, performance, security, and UI quality. Use only when the user explicitly asks for a product audit, health check, readiness review, or structured codebase assessment.
---

# QuranAtlas Product Audit

This skill is for explicit audit requests only.

## Workflow

1. Read `docs/product-info.md`, `docs/tech-stack.md`, and the relevant surface dossiers.
2. Evaluate at least these dimensions:
   - Reader First product baseline: complete Verse/Mushaf reading, bookmarks, saved position, Daily Wird, search/navigation, reader preferences, and curated reader-attached metadata
   - one-active-pack and install-before-activate semantics for qira'ah/riwayah, translation, tafsir, curated metadata, Mushaf pages, and search/index assets
   - removed-scope boundaries: audio and personal marks/tags/notes/review/edges are not product scope except bookmarks
   - AI scope boundary: infrastructure/retrieval readiness only; no assistant, chat, agent, synthesis UI, or current-roadmap reflection-prompt product
   - architecture
   - functional correctness
   - reliability
   - performance
   - security
   - UI quality
3. Ground every material finding in code references.
4. Separate shipped-behavior defects from enhancement ideas.
5. Verify severe findings before presenting them.

## Output

Report:

- findings ordered by severity
- supporting file references
- open questions
- residual risk
- a prioritized fix list

## Repo references

- `docs/context/open-issues.md`
- `docs/context/implemented.md`
- `docs/context/roadmap.md`
- `docs/context/surfaces/*.md`
