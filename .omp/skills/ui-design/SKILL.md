---
name: ui-design
description: QuranAtlas UI feedback loop — director design brief, implementer implementation, targeted independent review, visual review sign-off, and correctness review; every seat bound by a modelRoles role.
---

# UI feedback loop

Follow this sequence for QuranAtlas UI work. Roles resolve through
`modelRoles` in `.omp/config.yml` — the single source of model bindings;
never restate model IDs in skills, agents, or docs. Agents live in
`.omp/agents/`.

1. **Brief (`ui-director`, `@ui_director`).** Inspect the live UI,
   `src/design-system/tokens/{primitives,semantic,tailwind-theme}.css`,
   `src/design-system/registry/component-registry.json`, and every relevant
   `src/components/ui/**` primitive. Specify exact tokens, components, states,
   themes, viewports, and motion; leave no aesthetic choice to implementation.
2. **Implement/repair (`ui-implementer`, `@ui_implementer`).** Apply the
   director brief exactly. The implementer is the broad implementation seat,
   not a UI-only seat. Use `skill://ui-verify` and exercise the affected
   desktop/mobile states.
3. **Targeted independent review.** Advisors are off by default. Enable one
   only when it adds independent evidence not already produced by the
   implementer; use a bounded correctness review for behavior changes.
4. **Visual review/sign-off (`ui-visual-reviewer`, `@ui_visual`).** Review
   rendered pixels at 1280x900 and 375x812 with transient screenshots after
   coherent screen changes. At milestones return `approve` or concrete
   visual deltas.
5. **Correctness review (`ui-correctness-reviewer`, `@ui_correctness`).**
   Run only when behavior, state, persistence, routing, focus,
   accessibility, or TypeScript contracts changed. Never choose styling.

The main session remains the orchestrator (`default` role). It schedules
these seats and does not implement or make aesthetic decisions. Do not
enable a continuous advisor stream or duplicate a worker's reasoning.

UI boundaries: use `src/components/ui/**`, keep Radix imports inside that
layer, use design tokens instead of literals, persist no screenshots, and
verify desktop/mobile across all themes and reduced-motion states.
