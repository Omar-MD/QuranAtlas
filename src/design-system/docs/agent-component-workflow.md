# React Component Workflow

For React UI work, start with the registry and compose approved components.

1. Check `src/design-system/registry/component-registry.json`.
2. Import primitives from `src/components/ui`.
3. Add a story for new component states. Add automated tests when required by the repo workflow for changed behavior, fixed regressions, or durable verification.
4. Extend the registry in the same change.
5. Run `pnpm run validate` before handoff.

Forbidden patterns:

- Direct Radix imports outside `src/components/ui/**`.
- Raw controls in React feature code when an owned UI component exists.
- Tailwind palette utilities or unapproved arbitrary values.
- Feature code bypassing owned React components or design-system boundaries.
