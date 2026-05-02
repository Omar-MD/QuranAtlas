---
name: quranatlas-product-audit
description: Run a QuranAtlas-specific product audit across architecture, correctness, reliability, performance, security, and UI quality. Use only when the user explicitly asks for a product audit, health check, readiness review, or structured codebase assessment.
---

# QuranAtlas Product Audit

This skill is for explicit audit requests only.

## Workflow

1. Read `docs/product-info.md`, `docs/tech-stack.md`, and the relevant surface dossiers.
2. Evaluate at least these dimensions:
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
