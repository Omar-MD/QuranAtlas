---
name: ui-design
description: QuranAtlas UI feedback loop — Kimi K3 design direction, Flash implementation, targeted independent review, Kimi K2.6 visual sign-off, and Luna correctness review.
---

# UI feedback loop

Follow this sequence for QuranAtlas UI work. Roles resolve through project
`modelRoles` in `.omp/config.yml`; agents live in `.omp/agents/`.

1. **Brief (Kimi K3 — `ui-director`, `ui_director`).** Inspect the live UI,
   `src/design-system/tokens/{primitives,semantic,tailwind-theme}.css`,
   `src/design-system/registry/component-registry.json`, and every relevant
   `src/components/ui/**` primitive. Specify exact tokens, components, states,
   themes, viewports, and motion; leave no aesthetic choice to implementation.
2. **Implement/repair (GLM-5.3-Flash — `ui-implementer`).** Apply the K3
   brief exactly. Flash is the broad implementation seat, not a UI-only seat.
   Use `skill://ui-verify` and exercise the affected desktop/mobile states.
3. **Targeted independent review.** Advisors are off by default. Enable one
   only when it adds independent evidence not already produced by the
   implementer; use a bounded Luna correctness review for behavior changes.
4. **Visual review/sign-off (Kimi K2.6 — `ui-visual-reviewer`,
   `ui_visual`).** Review rendered pixels at 1280x900 and 375x812 with
   transient screenshots after coherent screen changes. At milestones return
   `approve` or concrete visual deltas.
5. **Correctness review (Luna — `ui-correctness-reviewer`).** Run only when
   behavior, state, persistence, routing, focus, accessibility, or TypeScript
   contracts changed. Never choose styling.

The main session remains the Luna orchestrator. It schedules these seats and
does not implement or make aesthetic decisions. Do not enable a continuous
advisor stream or duplicate a worker's reasoning.

UI boundaries: use `src/components/ui/**`, keep Radix imports inside that
layer, use design tokens instead of literals, persist no screenshots, and
verify desktop/mobile across all themes and reduced-motion states.
