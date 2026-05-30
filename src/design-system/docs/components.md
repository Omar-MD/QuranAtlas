# React Owned Components

`src/components/ui/**` is the owned React component layer. Components may
use Radix primitives internally, but product and app code must import QuranAtlas
components from the UI barrel instead of importing Radix directly.

The shadcn/ui configuration in `components.json` records copy-in conventions and
aliases. It is configuration and provenance, not permission to keep upstream
defaults unreviewed. Copied patterns must be adapted to QuranAtlas semantic
tokens, `qar:` Tailwind utilities, accessibility expectations, and local tests.

Extension rules:

- Add variants only when a product surface needs them.
- Keep icon-only actions on `IconButton` with a required `label`.
- Use `Button`, `SegmentedControl`, `Switch`, `Slider`, menus, dialogs, sheets,
  and popovers for familiar controls instead of ad hoc raw elements.
- Register new components in `src/design-system/registry` in the same
  change that adds them.
