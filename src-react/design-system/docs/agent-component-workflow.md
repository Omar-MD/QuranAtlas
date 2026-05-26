# React Component Workflow

For React UI work, start with the registry and compose approved components.

1. Check `src-react/design-system/registry/component-registry.json`.
2. Import primitives from `src-react/components/ui`.
3. Add a story and focused unit coverage for new component states.
4. Extend the registry in the same change.
5. Run `pnpm run validate:react` before handoff.

Forbidden patterns:

- Direct Radix imports outside `src-react/components/ui/**`.
- Raw controls in React feature code when an owned UI component exists.
- Tailwind palette utilities or unapproved arbitrary values.
- React code importing Svelte app modules.
